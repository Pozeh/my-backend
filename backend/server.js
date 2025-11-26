const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure CORS for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow your Render frontend and local development
    const allowedOrigins = [
      'https://my-backend-1-jk7w.onrender.com',
      // Add your frontend URL here when deployed
      'https://ecoloop-f93m.onrender.com',
      'https://ecoloop-f93m.onrender.com/',
      'https://ecoloop-f93m.onrender.com/admin',
      'https://ecoloop-f93m.onrender.com/admin/',
      'https://ecoloop-f93m.onrender.com/frontend',
      'https://ecoloop-f93m.onrender.com/frontend/',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'file://', // For local HTML file testing
      // Allow all render.com origins for flexibility
      /\.onrender\.com$/
    ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Log the blocked origin for debugging
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] // Allowed headers
};

app.use(cors(corsOptions));
app.use(express.json());

// Handle pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle pre-flight
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// MongoDB connection
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectToMongo() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    db = client.db("ecoloop");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Root health check endpoint
app.get("/", async (req, res) => {
  try {
    // Test MongoDB connection
    await db.collection("users").findOne({});
    
    res.json({
      success: true,
      message: "EcoLoop Kenya Backend API is running",
      status: "healthy",
      mongodb: "connected",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Backend running but MongoDB connection failed",
      error: error.message,
      status: "unhealthy"
    });
  }
});

// MongoDB connection test endpoint
app.get("/api/test/mongodb", async (req, res) => {
  try {
    // Test basic MongoDB operations
    const collections = await db.listCollections().toArray();
    const userCount = await db.collection("users").countDocuments();
    const sellerCount = await db.collection("sellers").countDocuments();
    const adminCount = await db.collection("admins").countDocuments();
    
    res.json({
      success: true,
      message: "MongoDB connection test successful",
      collections: collections.map(c => c.name),
      stats: {
        users: userCount,
        sellers: sellerCount,
        admins: adminCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "MongoDB connection test failed",
      error: error.message
    });
  }
});

// Routes
app.get("/api/test", async (req, res) => {
  try {
    await db.admin().ping();
    res.json({ connected: true, message: "MongoDB Atlas is working!" });
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

app.post("/api/save", async (req, res) => {
  try {
    const data = req.body;
    const result = await db.collection("windsurfdata").insertOne({
      ...data,
      timestamp: new Date()
    });
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/data", async (req, res) => {
  try {
    const data = await db.collection("windsurfdata").find({}).toArray();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Message System Endpoints

// Get all conversations for a user
app.get("/api/messages/conversations/:userEmail", async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const conversations = await db.collection("conversations")
      .find({ 
        participants: { $elemMatch: { email: userEmail } }
      })
      .sort({ lastTimestamp: -1 })
      .toArray();
    
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get conversation between two users
app.get("/api/messages/conversation/:userEmail/:sellerEmail", async (req, res) => {
  try {
    const { userEmail, sellerEmail } = req.params;
    const participants = [userEmail, sellerEmail].sort();
    const conversationId = participants.join('_');
    
    const conversation = await db.collection("conversations").findOne({ id: conversationId });
    
    if (!conversation) {
      return res.json({ success: true, conversation: null });
    }
    
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send a message
app.post("/api/messages/send", async (req, res) => {
  try {
    const { senderEmail, receiverEmail, content, subject, productId } = req.body;
    
    if (!senderEmail || !receiverEmail || !content) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    
    const participants = [senderEmail, receiverEmail].sort();
    const conversationId = participants.join('_');
    
    const message = {
      id: new Date().getTime().toString(),
      sender: senderEmail,
      receiver: receiverEmail,
      content: content,
      subject: subject || '',
      productId: productId || null,
      timestamp: new Date(),
      read: false
    };
    
    // Check if conversation exists
    let conversation = await db.collection("conversations").findOne({ id: conversationId });
    
    if (conversation) {
      // Add message to existing conversation
      await db.collection("conversations").updateOne(
        { id: conversationId },
        {
          $push: { messages: message },
          $set: { 
            lastMessage: content,
            lastTimestamp: new Date(),
            updatedAt: new Date()
          },
          $inc: { 
            unreadCount: receiverEmail === conversation.participants[0].email ? 1 : 0
          }
        }
      );
    } else {
      // Create new conversation
      conversation = {
        id: conversationId,
        participants: [
          { email: senderEmail, name: '', unreadCount: 0 },
          { email: receiverEmail, name: '', unreadCount: 1 }
        ],
        messages: [message],
        lastMessage: content,
        lastTimestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        unreadCount: 1,
        productId: productId || null
      };
      
      await db.collection("conversations").insertOne(conversation);
    }
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark messages as read
app.post("/api/messages/read/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userEmail } = req.body;
    
    await db.collection("conversations").updateOne(
      { id: conversationId },
      {
        $set: { 
          "messages.$[msg].read": true,
          unreadCount: 0
        }
      },
      {
        arrayFilters: [{ "msg.sender": { $ne: userEmail } }]
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unread message count for a user
app.get("/api/messages/unread/:userEmail", async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    
    const conversations = await db.collection("conversations")
      .find({ 
        participants: { $elemMatch: { email: userEmail } }
      })
      .toArray();
    
    let unreadCount = 0;
    conversations.forEach(conv => {
      const unreadMessages = conv.messages.filter(msg => 
        msg.receiver === userEmail && !msg.read
      );
      unreadCount += unreadMessages.length;
    });
    
    res.json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Management Endpoints

// Admin authentication endpoint
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Admin login attempt:', { email, timestamp: new Date().toISOString() });
    
    // Check if admin exists in MongoDB
    const admin = await db.collection("admins").findOne({ 
      email: email, 
      password: password,
      status: "active"
    });
    
    if (admin) {
      // Update last login
      await db.collection("admins").updateOne(
        { _id: admin._id },
        { $set: { lastLogin: new Date() } }
      );
      
      // Create session
      const session = {
        email: admin.email,
        name: admin.name || "Administrator",
        role: "admin",
        loginTime: new Date().toISOString(),
        sessionId: new ObjectId().toString()
      };
      
      console.log('Admin login successful:', { email, timestamp: session.loginTime });
      
      res.json({ 
        success: true, 
        message: "Login successful",
        admin: {
          email: admin.email,
          name: admin.name || "Administrator",
          role: admin.role || "admin"
        },
        session: session
      });
    } else {
      console.log('Admin login failed: Invalid credentials for', email);
      res.status(401).json({ 
        success: false, 
        error: "Invalid email or password" 
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Login failed. Please try again." 
    });
  }
});

// Create default admin endpoint (for setup)
app.post("/api/admin/setup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await db.collection("admins").findOne({ email: email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        error: "Admin with this email already exists" 
      });
    }
    
    // Create new admin
    const admin = {
      email: email,
      password: password,
      name: name || "Administrator",
      role: "admin",
      status: "active",
      createdAt: new Date(),
      createdBy: "system"
    };
    
    const result = await db.collection("admins").insertOne(admin);
    
    console.log('Admin created successfully:', { email, id: result.insertedId });
    
    res.json({ 
      success: true, 
      message: "Admin created successfully",
      adminId: result.insertedId
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create admin" 
    });
  }
});

// Comprehensive Seller Registration
app.post("/api/seller/register", async (req, res) => {
  try {
    const {
      // Personal Information
      firstName,
      lastName,
      email,
      phone,
      password,
      
      // Business Information
      businessName,
      businessType,
      businessDescription,
      businessAddress,
      businessCity,
      businessCountry,
      
      // Store Information
      storeName,
      storeDescription,
      storeCategory,
      
      // Legal Information
      businessLicense,
      taxIdentification,
      
      // Banking Information
      bankName,
      accountNumber,
      accountName,
      
      // Additional Information
      website,
      socialMedia,
      operatingHours
    } = req.body;
    
    // Check if seller already exists
    const existingSeller = await db.collection("sellers").findOne({ 
      $or: [{ email: email }, { phone: phone }] 
    });
    if (existingSeller) {
      return res.status(400).json({ 
        success: false, 
        error: "Seller with this email or phone already exists" 
      });
    }
    
    // Create new seller with pending status
    const seller = {
      // Personal Details
      firstName,
      lastName,
      email,
      phone,
      password,
      
      // Business Details
      businessName,
      businessType,
      businessDescription,
      businessAddress,
      businessCity,
      businessCountry,
      
      // Store Details
      storeName,
      storeDescription,
      storeCategory,
      
      // Legal Documents
      businessLicense,
      taxIdentification,
      
      // Banking Details
      bankName,
      accountNumber,
      accountName,
      
      // Additional Info
      website,
      socialMedia,
      operatingHours,
      
      // System Fields
      status: "pending", // Requires admin approval
      approvalStatus: "pending",
      rejectionReason: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      
      // Statistics
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      
      // Verification
      emailVerified: false,
      phoneVerified: false,
      businessVerified: false
    };
    
    const result = await db.collection("sellers").insertOne(seller);
    
    console.log('Seller registration submitted:', { 
      email, 
      businessName, 
      storeName,
      id: result.insertedId 
    });
    
    res.json({ 
      success: true, 
      message: "Seller registration submitted successfully. Awaiting admin approval.",
      sellerId: result.insertedId,
      status: "pending"
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to register seller" 
    });
  }
});

// Comprehensive Buyer Registration
app.post("/api/user/register", async (req, res) => {
  try {
    const {
      // Personal Information
      firstName,
      lastName,
      email,
      phone,
      password,
      
      // Address Information
      streetAddress,
      city,
      state,
      postalCode,
      country,
      
      // Preferences
      preferences,
      notifications,
      
      // Additional Information
      dateOfBirth,
      gender
    } = req.body;
    
    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ 
      $or: [{ email: email }, { phone: phone }] 
    });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: "User with this email or phone already exists" 
      });
    }
    
    // Create new user
    const user = {
      // Personal Details
      firstName,
      lastName,
      email,
      phone,
      password,
      
      // Address Details
      streetAddress,
      city,
      state,
      postalCode,
      country,
      
      // Preferences
      preferences: preferences || {
        categories: [],
        priceRange: null,
        brands: [],
        notifications: true
      },
      notifications: notifications !== false, // Default to true
      
      // Additional Info
      dateOfBirth,
      gender,
      
      // Shopping Information
      cart: [],
      wishlist: [],
      orders: [],
      
      // Statistics
      totalOrders: 0,
      totalSpent: 0,
      favoriteProducts: [],
      
      // System Fields
      status: "active",
      emailVerified: false,
      phoneVerified: false,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null
    };
    
    const result = await db.collection("users").insertOne(user);
    
    console.log('User registered successfully:', { 
      email, 
      firstName, 
      lastName,
      id: result.insertedId 
    });
    
    res.json({ 
      success: true, 
      message: "User registered successfully",
      userId: result.insertedId
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to register user" 
    });
  }
});

// Seller Login (only for approved sellers)
app.post("/api/seller/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find seller with approved status
    const seller = await db.collection("sellers").findOne({ 
      email: email, 
      password: password,
      status: "approved"
    });
    
    if (!seller) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid credentials or account not approved" 
      });
    }
    
    // Update last login
    await db.collection("sellers").updateOne(
      { _id: seller._id },
      { $set: { lastLogin: new Date() } }
    );
    
    // Create session
    const session = {
      sellerId: seller._id.toString(),
      email: seller.email,
      name: `${seller.firstName} ${seller.lastName}`,
      businessName: seller.businessName,
      storeName: seller.storeName,
      role: "seller",
      loginTime: new Date().toISOString(),
      sessionId: new ObjectId().toString()
    };
    
    console.log('Seller login successful:', { 
      email, 
      businessName: seller.businessName,
      timestamp: session.loginTime 
    });
    
    res.json({ 
      success: true, 
      message: "Login successful",
      session: session
    });
  } catch (error) {
    console.error('Seller login error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Login failed. Please try again." 
    });
  }
});

// User Login
app.post("/api/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await db.collection("users").findOne({ 
      email: email, 
      password: password,
      status: "active"
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid email or password" 
      });
    }
    
    // Update last login
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    
    // Create session
    const session = {
      userId: user._id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: "user",
      loginTime: new Date().toISOString(),
      sessionId: new ObjectId().toString()
    };
    
    console.log('User login successful:', { 
      email, 
      name: `${user.firstName} ${user.lastName}`,
      timestamp: session.loginTime 
    });
    
    res.json({ 
      success: true, 
      message: "Login successful",
      session: session
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Login failed. Please try again." 
    });
  }
});

// Auth Verification
app.get("/api/auth/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: "No token provided" 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For now, we'll use a simple token verification
    // In production, you should use JWT or proper session management
    const user = await db.collection("users").findOne({ 
      email: token,
      status: "active"
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token" 
      });
    }

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: "user"
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Verification failed" 
    });
  }
});

// Get dashboard statistics
app.get("/api/admin/stats", async (req, res) => {
  try {
    const stats = {
      totalUsers: await db.collection("users").countDocuments(),
      totalSellers: await db.collection("sellers").countDocuments({ status: "approved" }),
      pendingSellers: await db.collection("sellers").countDocuments({ status: "pending" }),
      totalProducts: await db.collection("products").countDocuments(),
      pendingProducts: await db.collection("products").countDocuments({ status: "pending" }),
      totalOrders: await db.collection("orders").countDocuments(),
      totalRevenue: await db.collection("orders").aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]).toArray()
    };

    stats.totalRevenue = stats.totalRevenue.length > 0 ? stats.totalRevenue[0].total : 0;

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sellers
app.get("/api/admin/sellers", async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    const sellers = await db.collection("sellers")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("sellers").countDocuments(filter);

    res.json({ 
      success: true, 
      sellers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve seller
app.post("/api/admin/sellers/:sellerId/approve", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { adminEmail } = req.body;

    const result = await db.collection("sellers").updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: adminEmail
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    res.json({ success: true, message: "Seller approved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject seller
app.post("/api/admin/sellers/:sellerId/reject", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { adminEmail, reason } = req.body;

    const result = await db.collection("sellers").updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: adminEmail,
          rejectionReason: reason || "Application does not meet requirements"
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    res.json({ success: true, message: "Seller rejected successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sellers (for admin management)
app.get("/api/admin/sellers", async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    const sellers = await db.collection("sellers")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("sellers").countDocuments(filter);

    res.json({ 
      success: true, 
      sellers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sellers error:', error);
    res.status(500).json({ success: false, error: "Failed to fetch sellers" });
  }
});

// Approve seller
app.post("/api/admin/sellers/:sellerId/approve", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ success: false, error: "Admin email is required" });
    }

    const result = await db.collection("sellers").updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          status: "approved",
          approvalStatus: "approved",
          approvedAt: new Date(),
          approvedBy: adminEmail,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    res.json({ success: true, message: "Seller approved successfully" });
  } catch (error) {
    console.error('Approve seller error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject seller
app.post("/api/admin/sellers/:sellerId/reject", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { adminEmail, reason } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ success: false, error: "Admin email is required" });
    }

    const result = await db.collection("sellers").updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          status: "rejected",
          approvalStatus: "rejected",
          rejectedAt: new Date(),
          rejectedBy: adminEmail,
          rejectionReason: reason || "Application does not meet requirements",
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    res.json({ success: true, message: "Seller rejected successfully" });
  } catch (error) {
    console.error('Reject seller error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all products
app.get("/api/admin/products", async (req, res) => {
  try {
    const { status = "all", category = "all", page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status !== "all") {
      filter.status = status;
    }
    if (category !== "all") {
      filter.category = category;
    }

    const products = await db.collection("products")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("products").countDocuments(filter);

    res.json({ 
      success: true, 
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve product
app.post("/api/admin/products/:productId/approve", async (req, res) => {
  try {
    const { productId } = req.params;
    const { adminEmail } = req.body;

    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: adminEmail
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, message: "Product approved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject product
app.post("/api/admin/products/:productId/reject", async (req, res) => {
  try {
    const { productId } = req.params;
    const { adminEmail, reason } = req.body;

    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: adminEmail,
          rejectionReason: reason || "Product does not meet guidelines"
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, message: "Product rejected successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all users
app.get("/api/admin/users", async (req, res) => {
  try {
    const { role = "all", status = "all", page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (role !== "all") {
      filter.role = role;
    }
    if (status !== "all") {
      filter.status = status;
    }

    const users = await db.collection("users")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("users").countDocuments(filter);

    res.json({ 
      success: true, 
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all orders
app.get("/api/admin/orders", async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    const orders = await db.collection("orders")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("orders").countDocuments(filter);

    res.json({ 
      success: true, 
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status
app.post("/api/admin/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminEmail } = req.body;

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status: status,
          updatedAt: new Date(),
          updatedBy: adminEmail
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system analytics
app.get("/api/admin/analytics", async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    
    // Calculate date range
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = {
      sales: await db.collection("orders").aggregate([
        { $match: { createdAt: { $gte: startDate }, status: "completed" } },
        { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]).toArray(),

      users: await db.collection("users").aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]).toArray(),

      products: await db.collection("products").aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]).toArray(),

      topCategories: await db.collection("products").aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),

      topSellers: await db.collection("sellers").aggregate([
        { $match: { status: "approved" } },
        { $lookup: {
          from: "products",
          localField: "email",
          foreignField: "sellerEmail",
          as: "products"
        }},
        { $addFields: { productCount: { $size: "$products" } } },
        { $sort: { productCount: -1 } },
        { $limit: 10 }
      ]).toArray()
    };

    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent activity
app.get("/api/admin/activity", async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const activities = await db.collection("activity_log")
      .find({})
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log activity
app.post("/api/admin/activity", async (req, res) => {
  try {
    const { user, action, details, type } = req.body;
    
    const activity = {
      user: user,
      action: action,
      details: details,
      type: type || "general",
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress
    };

    await db.collection("activity_log").insertOne(activity);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system settings
app.get("/api/admin/settings", async (req, res) => {
  try {
    const settings = await db.collection("settings").findOne({}) || {};
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update system settings
app.post("/api/admin/settings", async (req, res) => {
  try {
    const { adminEmail, ...settings } = req.body;
    
    settings.updatedAt = new Date();
    settings.updatedBy = adminEmail;

    await db.collection("settings").updateOne(
      {},
      { $set: settings },
      { upsert: true }
    );

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET /api/test - Test MongoDB connection`);
    console.log(`  POST /api/save - Save data to windsurfdata collection`);
    console.log(`  GET /api/data - Get all data from windsurfdata collection`);
    console.log(`  GET /api/messages/conversations/:userEmail - Get user conversations`);
    console.log(`  GET /api/messages/conversation/:userEmail/:sellerEmail - Get conversation`);
    console.log(`  POST /api/messages/send - Send a message`);
    console.log(`  POST /api/messages/read/:conversationId - Mark messages as read`);
    console.log(`  GET /api/messages/unread/:userEmail - Get unread count`);
    console.log(`  POST /api/admin/login - Admin authentication`);
    console.log(`  POST /api/admin/setup - Create admin account`);
    console.log(`  GET /api/admin/stats - Get dashboard statistics`);
    console.log(`  GET /api/admin/sellers - Get all sellers`);
    console.log(`  POST /api/admin/sellers/:sellerId/approve - Approve seller`);
    console.log(`  POST /api/admin/sellers/:sellerId/reject - Reject seller`);
    console.log(`  GET /api/admin/products - Get all products`);
    console.log(`  POST /api/admin/products/:productId/approve - Approve product`);
    console.log(`  POST /api/admin/products/:productId/reject - Reject product`);
    console.log(`  GET /api/admin/users - Get all users`);
    console.log(`  GET /api/admin/orders - Get all orders`);
    console.log(`  POST /api/admin/orders/:orderId/status - Update order status`);
    console.log(`  GET /api/admin/analytics - Get system analytics`);
    console.log(`  GET /api/admin/activity - Get recent activity`);
    console.log(`  POST /api/admin/activity - Log activity`);
    console.log(`  GET /api/admin/settings - Get system settings`);
    console.log(`  POST /api/admin/settings - Update system settings`);
  });
});
