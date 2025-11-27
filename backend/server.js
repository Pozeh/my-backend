const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const secureAuthRoutes = require('./secure-auth-routes');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure CORS for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow your frontend domains
    const allowedOrigins = [
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
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'file://', // For local HTML file testing
      // Allow all render.com origins for flexibility
      /\.onrender\.com$/
    ];
    
    // Allow any subdomain of .onrender.com
    if (origin && origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'ecoloop-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

// Comprehensive// COMPLETELY REBUILT SELLER REGISTRATION
app.post("/api/seller/register", async (req, res) => {
  try {
    console.log(' SELLER REGISTRATION STARTED');
    console.log('Request body:', req.body);
    
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
      operatingHours
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password || !businessName) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: firstName, lastName, email, password, businessName" 
      });
    }
    
    const db = req.app.locals.db;
    
    // Check if seller already exists
    const existingSeller = await db.collection("sellers").findOne({ 
      $or: [{ email: email }, { phone: phone }] 
    });
    
    if (existingSeller) {
      console.log(' Seller already exists:', { email, phone });
      return res.status(400).json({ 
        success: false, 
        error: "Seller with this email or phone already exists" 
      });
    }
    
    // Hash the password
    const saltRounds = 12;
    console.log('🔐 Starting password hashing:', { 
      passwordLength: password.length, 
      passwordStart: password.substring(0, 3) + '...',
      saltRounds 
    });
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Password hashed successfully:', { 
      hashLength: hashedPassword.length, 
      hashStart: hashedPassword.substring(0, 20) + '...',
      hashType: typeof hashedPassword 
    });
    
    // Create new seller with proper schema
    const seller = {
      // Core Identity
      name: `${firstName} ${lastName}`,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      password: hashedPassword, // Store hashed password
      
      // Business Profile
      businessName: businessName,
      businessType: businessType || "individual",
      businessDescription: businessDescription || "",
      businessAddress: businessAddress || "",
      businessCity: businessCity || "",
      businessCountry: businessCountry || "Kenya",
      
      // Store Profile
      storeName: storeName || businessName,
      storeDescription: storeDescription || businessDescription || "",
      storeCategory: storeCategory || "general",
      
      // Legal & Banking
      businessLicense: businessLicense || "",
      taxIdentification: taxIdentification || "",
      bankName: bankName || "",
      accountNumber: accountNumber || "",
      accountName: accountName || "",
      
      // Online Presence
      website: website || "",
      socialMedia: socialMedia || "",
      operatingHours: operatingHours || "",
      
      // Approval Status
      approvalStatus: "pending", // Requires admin approval
      status: "pending", // Backward compatibility
      
      // Metadata
      registrationDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      
      // Statistics
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      
      // Verification Flags
      emailVerified: false,
      phoneVerified: false,
      businessVerified: false,
      
      // Approval Tracking
      approvedBy: null,
      approvedDate: null,
      rejectedBy: null,
      rejectedDate: null,
      rejectionReason: null
    };
    
    console.log('📝 Creating seller document...');
    console.log('🔍 Seller object before insertion:', {
      email: seller.email,
      passwordHashLength: seller.password ? seller.password.length : 0,
      passwordHashStart: seller.password ? seller.password.substring(0, 20) + '...' : 'null',
      approvalStatus: seller.approvalStatus
    });
    
    const result = await db.collection("sellers").insertOne(seller);
    
    console.log('✅ Seller registered successfully:', { 
      email, 
      businessName, 
      storeName,
      sellerId: result.insertedId.toString(),
      approvalStatus: seller.approvalStatus
    });
    
    // Verify the seller was stored correctly
    const storedSeller = await db.collection("sellers").findOne({ _id: result.insertedId });
    console.log('🔍 Verification - stored seller:', {
      email: storedSeller.email,
      passwordHashLength: storedSeller.password ? storedSeller.password.length : 0,
      passwordHashStart: storedSeller.password ? storedSeller.password.substring(0, 20) + '...' : 'null',
      approvalStatus: storedSeller.approvalStatus
    });
    
    res.status(201).json({ 
      success: true, 
      message: "Seller registration submitted successfully. Awaiting admin approval.",
      sellerId: result.insertedId,
      approvalStatus: seller.approvalStatus,
      email: seller.email,
      businessName: seller.businessName
    });
    
  } catch (error) {
    console.error(' SELLER REGISTRATION ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to register seller: " + error.message 
    });
  }
});

// Unified Login Endpoint - Strict Role-Based Authentication
app.post("/api/user/login", async (req, res) => {
  try {
    const { email, password, role, rememberMe } = req.body;
    
    console.log('Login attempt:', { email, role, timestamp: new Date().toISOString() });
    
    // Validate role parameter
    if (!role || !['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role specified. Please select User, Seller, or Admin." 
      });
    }
    
    let user = null;
    let userCollection = null;
    
    // STEP 1: Find user in appropriate collection based on requested role
    if (role === 'seller') {
      // Seller login - search in sellers collection
      userCollection = 'sellers';
      user = await db.collection("sellers").findOne({ email: email });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Seller not found" 
        });
      }
      
      // Compare hashed password
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false, 
          message: "Incorrect password" 
        });
      }
      
      // Check seller approval status
      if (user.approvalStatus === 'pending' || user.status === 'pending') {
        return res.status(401).json({ 
          success: false, 
          message: "Your seller account is awaiting admin approval." 
        });
      }
      
      if (user.approvalStatus === 'rejected' || user.status === 'rejected') {
        return res.status(401).json({ 
          success: false, 
          message: "Your seller application has been rejected. Please contact support." 
        });
      }
      
      if (user.approvalStatus !== 'approved' && user.status !== 'approved') {
        return res.status(401).json({ 
          success: false, 
          message: "Your seller account is not active. Please contact support." 
        });
      }
      
    } else if (role === 'user') {
      // User login - search in users collection
      userCollection = 'users';
      user = await db.collection("users").findOne({ 
        email: email,
        status: "active"
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password for user account." 
        });
      }
      
      // CRITICAL: Verify this user is actually a user (not a seller)
      if (user.role && user.role === 'seller') {
        return res.status(401).json({ 
          success: false, 
          message: "This account is registered as a seller. Please use Seller Login instead." 
        });
      }
      
      // Verify password using bcrypt
      let isPasswordValid = false;
      
      // Check if password is hashed (starts with $2a$, $2b$, etc.)
      if (user.password && user.password.startsWith('$2')) {
        // Hashed password - use bcrypt comparison
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Plaintext password - direct comparison (for backward compatibility)
        isPasswordValid = (password === user.password);
        
        // If plaintext password matches, hash it for future security
        if (isPasswordValid) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
          );
          console.log('Password hashed for user:', email);
        }
      }
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password for user account." 
        });
      }
      
    } else if (role === 'admin') {
      // Admin login - search in admins collection
      userCollection = 'admins';
      user = await db.collection("admins").findOne({ 
        email: email,
        status: "active"
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password for admin account." 
        });
      }
      
      // Verify password using bcrypt
      let isPasswordValid = false;
      
      // Check if password is hashed (starts with $2a$, $2b$, etc.)
      if (user.password && user.password.startsWith('$2')) {
        // Hashed password - use bcrypt comparison
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Plaintext password - direct comparison (for backward compatibility)
        isPasswordValid = (password === user.password);
        
        // If plaintext password matches, hash it for future security
        if (isPasswordValid) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await db.collection("admins").updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
          );
          console.log('Password hashed for admin:', email);
        }
      }
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password for admin account." 
        });
      }
    }
    
    // STEP 2: Update last login timestamp
    await db.collection(userCollection).updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    
    // STEP 3: Create standardized user object for frontend
    const userResponse = {
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      name: user.name || `${user.firstName} ${user.lastName || ''}`,
      role: role, // Use the requested role (already validated)
      loginTime: new Date().toISOString()
    };
    
    // Add seller-specific fields
    if (role === 'seller') {
      userResponse.sellerId = user.sellerId;
      userResponse.sellerStatus = user.status;
      userResponse.businessName = user.businessName;
      userResponse.storeName = user.storeName;
    }
    
    console.log(`${role.toUpperCase()} login successful:`, { 
      email, 
      name: userResponse.name,
      role: role,
      timestamp: new Date().toISOString() 
    });
    
    res.json({ 
      success: true, 
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} login successful`,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Login failed. Please try again." 
    });
  }
});

// Session Check Endpoint - Verify authentication status
app.get("/api/user/session", async (req, res) => {
  try {
    // For now, we'll use localStorage-based sessions
    // In a production app, this would verify server-side sessions
    res.json({ 
      success: false, 
      message: "No active session found" 
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Session check failed" 
    });
  }
});

// COMPLETELY REBUILT SELLER LOGIN
app.post("/api/seller/login", async (req, res) => {
  try {
    console.log('🔥 SELLER LOGIN STARTED');
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log('❌ Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ 
        success: false, 
        error: "Email and password are required" 
      });
    }
    
    // Check database connection
    const db = req.app.locals.db;
    if (!db) {
      console.error('❌ Database not connected');
      return res.status(500).json({ 
        success: false, 
        error: "Database connection error" 
      });
    }
    
    console.log('🔍 Looking for seller:', { email });
    
    // Find seller by email
    const seller = await db.collection("sellers").findOne({ email: email });
    
    if (!seller) {
      console.log('❌ Seller not found:', { email });
      return res.status(401).json({ 
        success: false, 
        error: "Seller not found" 
      });
    }
    
    console.log('✅ Seller found:', { 
      email, 
      approvalStatus: seller.approvalStatus, 
      status: seller.status 
    });
    
    // Compare hashed password
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, seller.password);
    } catch (bcryptError) {
      console.error('❌ Bcrypt comparison error:', bcryptError);
      return res.status(500).json({ 
        success: false, 
        error: "Password verification error" 
      });
    }
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch:', { email });
      return res.status(401).json({ 
        success: false, 
        error: "Incorrect password" 
      });
    }
    
    // Check approval status (check both fields for backward compatibility)
    const approvalStatus = seller.approvalStatus || seller.status;
    
    if (approvalStatus === 'pending') {
      console.log('⏳ Seller account pending:', { email, approvalStatus });
      return res.status(401).json({ 
        success: false, 
        error: "Seller account is pending admin approval" 
      });
    }
    
    if (approvalStatus === 'rejected') {
      console.log('❌ Seller account rejected:', { email, approvalStatus });
      return res.status(401).json({ 
        success: false, 
        error: "Seller account has been rejected" 
      });
    }
    
    if (approvalStatus !== 'approved') {
      console.log('❌ Seller account not approved:', { email, approvalStatus });
      return res.status(401).json({ 
        success: false, 
        error: "Seller account is not active" 
      });
    }
    
    // Update last login
    try {
      await db.collection("sellers").updateOne(
        { _id: seller._id },
        { $set: { lastLogin: new Date() } }
      );
    } catch (updateError) {
      console.error('⚠️ Failed to update last login:', updateError);
      // Continue anyway - login should still work
    }
    
    // Create seller session object
    const sellerSession = {
      sellerId: seller._id.toString(),
      email: seller.email,
      name: seller.name,
      firstName: seller.firstName,
      lastName: seller.lastName,
      businessName: seller.businessName,
      storeName: seller.storeName,
      approvalStatus: approvalStatus,
      loginTime: new Date().toISOString()
    };
    
    console.log('✅ Seller login successful:', { 
      email, 
      name: seller.name,
      businessName: seller.businessName,
      approvalStatus
    });
    
    // Always return JSON response
    return res.status(200).json({ 
      success: true, 
      message: "Seller login successful",
      seller: sellerSession
    });
    
  } catch (error) {
    console.error('🔥 SELLER LOGIN ERROR:', error);
    // Always return JSON response, never let error crash
    return res.status(500).json({ 
      success: false, 
      error: "Login failed: " + (error.message || "Unknown error") 
    });
  }
});

// Debug endpoint to check seller password storage
app.get("/api/debug/seller/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const db = req.app.locals.db;
    
    const seller = await db.collection("sellers").findOne({ email: email });
    
    if (!seller) {
      return res.json({ 
        success: false, 
        message: "Seller not found" 
      });
    }
    
    // Return safe info (not the actual hash)
    const debugInfo = {
      email: seller.email,
      name: seller.name,
      businessName: seller.businessName,
      approvalStatus: seller.approvalStatus || seller.status,
      passwordHashLength: seller.password ? seller.password.length : 0,
      passwordHashStart: seller.password ? seller.password.substring(0, 20) + "..." : "null",
      registrationDate: seller.registrationDate,
      createdAt: seller.createdAt,
      fields: Object.keys(seller)
    };
    
    console.log('🔍 Seller debug info:', debugInfo);
    
    res.json({ 
      success: true, 
      seller: debugInfo
    });
    
  } catch (error) {
    console.error('🔥 Debug endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test password verification endpoint
app.post("/api/debug/test-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = req.app.locals.db;
    
    const seller = await db.collection("sellers").findOne({ email: email });
    
    if (!seller) {
      return res.json({ 
        success: false, 
        message: "Seller not found" 
      });
    }
    
    console.log('🔍 Testing password verification:', { 
      email, 
      passwordProvided: !!password,
      passwordLength: password ? password.length : 0,
      hashExists: !!seller.password,
      hashLength: seller.password ? seller.password.length : 0
    });
    
    // Test bcrypt comparison
    let passwordMatch = false;
    let bcryptError = null;
    
    try {
      passwordMatch = await bcrypt.compare(password, seller.password);
      console.log('✅ Bcrypt comparison result:', passwordMatch);
    } catch (error) {
      bcryptError = error.message;
      console.error('❌ Bcrypt comparison error:', error);
    }
    
    res.json({ 
      success: true, 
      test: {
        email,
        passwordProvided: !!password,
        passwordLength: password ? password.length : 0,
        hashExists: !!seller.password,
        hashLength: seller.password ? seller.password.length : 0,
        passwordMatch,
        bcryptError
      }
    });
    
  } catch (error) {
    console.error('🔥 Password test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Database Migration: Hash existing unhashed seller passwords
app.post("/api/admin/migrate-seller-passwords", async (req, res) => {
  try {
    const { adminEmail } = req.body;
    
    if (!adminEmail) {
      return res.status(400).json({ 
        success: false, 
        error: "Admin email is required" 
      });
    }
    
    console.log('🔄 Starting seller password migration...');
    
    const db = req.app.locals.db;
    
    // Find all sellers with unhashed passwords (passwords shorter than 50 chars)
    const sellersWithUnhashedPasswords = await db.collection("sellers").find({
      $or: [
        { password: { $type: "string" } },
        { password: { $exists: true, $ne: null, $ne: "" } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${sellersWithUnhashedPasswords.length} sellers to check`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errors = [];
    
    for (const seller of sellersWithUnhashedPasswords) {
      try {
        // Check if password is already hashed (bcrypt hashes are typically 60 chars long)
        if (seller.password.length >= 50 && seller.password.startsWith('$2')) {
          console.log(`⏭️ Skipping ${seller.email} - password already hashed`);
          skippedCount++;
          continue;
        }
        
        // Hash the existing password
        const hashedPassword = await bcrypt.hash(seller.password, 12);
        
        // Update the seller record
        await db.collection("sellers").updateOne(
          { _id: seller._id },
          { 
            $set: { 
              password: hashedPassword,
              passwordMigrated: true,
              passwordMigratedAt: new Date(),
              passwordMigratedBy: adminEmail
            }
          }
        );
        
        console.log(`✅ Migrated password for ${seller.email}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${seller.email}:`, error);
        errors.push({ email: seller.email, error: error.message });
      }
    }
    
    console.log(`🎉 Migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${errors.length} errors`);
    
    res.json({ 
      success: true, 
      message: "Password migration completed",
      results: {
        totalChecked: sellersWithUnhashedPasswords.length,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errors.length,
        errorDetails: errors
      }
    });
    
  } catch (error) {
    console.error('🔥 Password migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Migration failed: " + error.message 
    });
  }
});

// Password reset endpoint for existing sellers
app.post("/api/seller/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: "Email and new password are required" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: "Password must be at least 6 characters long" 
      });
    }
    
    const db = req.app.locals.db;
    
    // Find the seller
    const seller = await db.collection("sellers").findOne({ email: email });
    
    if (!seller) {
      return res.status(404).json({ 
        success: false, 
        error: "Seller not found" 
      });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the seller's password
    await db.collection("sellers").updateOne(
      { _id: seller._id },
      { 
        $set: { 
          password: hashedPassword,
          passwordResetAt: new Date(),
          lastPasswordReset: new Date()
        }
      }
    );
    
    console.log('✅ Password reset successful for:', { email });
    
    res.json({ 
      success: true, 
      message: "Password reset successfully. You can now login with your new password."
    });
    
  } catch (error) {
    console.error('🔥 Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Password reset failed: " + error.message 
    });
  }
});

// Seller Profile Endpoint
app.get("/api/seller/profile", async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get seller email from multiple sources (query param, session, token)
    const sellerEmail = req.query.email || 
                       req.session?.sellerEmail || 
                       req.user?.email ||
                       req.headers['x-seller-email'];
    
    console.log('🔍 Fetching seller profile for:', sellerEmail, 'from sources:', {
      query: req.query.email,
      session: req.session?.sellerEmail,
      user: req.user?.email,
      header: req.headers['x-seller-email']
    });
    
    if (!sellerEmail) {
      return res.status(401).json({ 
        success: false, 
        error: "Seller email not provided" 
      });
    }
    
    const seller = await db.collection("sellers").findOne({ email: sellerEmail });
    
    if (!seller) {
      return res.status(404).json({ 
        success: false, 
        error: "Seller not found" 
      });
    }
    
    // Return safe seller data (exclude password)
    const sellerProfile = {
      _id: seller._id,
      name: seller.name,
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      phone: seller.phone,
      businessName: seller.businessName,
      businessType: seller.businessType,
      businessDescription: seller.businessDescription,
      storeName: seller.storeName,
      storeDescription: seller.storeDescription,
      storeCategory: seller.storeCategory,
      approvalStatus: seller.approvalStatus || seller.status,
      sellerStatus: seller.approvalStatus || seller.status, // Add for compatibility
      registrationDate: seller.registrationDate,
      createdAt: seller.createdAt,
      totalProducts: seller.totalProducts || 0,
      totalSales: seller.totalSales || 0,
      totalRevenue: seller.totalRevenue || 0,
      lastLogin: seller.lastLogin
    };
    
    console.log('✅ Seller profile fetched successfully for:', sellerEmail);
    
    res.json({ 
      success: true, 
      seller: sellerProfile 
    });
    
  } catch (error) {
    console.error('🔥 Seller profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch seller profile: " + error.message 
    });
  }
});

// Seller Statistics Endpoint
app.get("/api/seller/statistics/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const db = req.app.locals.db;
    
    console.log('📊 Fetching seller statistics for:', email);
    
    const seller = await db.collection("sellers").findOne({ email: email });
    
    if (!seller) {
      return res.status(404).json({ 
        success: false, 
        error: "Seller not found" 
      });
    }
    
    // Calculate statistics
    const statistics = {
      totalProducts: seller.totalProducts || 0,
      totalOrders: seller.totalSales || 0,
      totalRevenue: seller.totalRevenue || 0,
      averageRating: seller.averageRating || 0.0,
      approvedDate: seller.approvedDate,
      lastLogin: seller.lastLogin
    };
    
    console.log('✅ Seller statistics fetched:', statistics);
    
    res.json({ 
      success: true, 
      statistics: statistics 
    });
    
  } catch (error) {
    console.error('🔥 Seller statistics error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch seller statistics: " + error.message 
    });
  }
});

// Seller Notifications Endpoint
app.get("/api/seller/notifications/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const db = req.app.locals.db;
    
    console.log('📬 Fetching seller notifications for:', email);
    
    // For now, return default notifications
    // In a real implementation, you would fetch from a notifications collection
    const notifications = [
      {
        id: 1,
        type: 'info',
        title: 'Welcome to EcoLoop Seller Portal!',
        message: 'Your seller account has been successfully set up. Start by adding your first product.',
        createdAt: new Date().toISOString(),
        read: false
      },
      {
        id: 2,
        type: 'success',
        title: 'Account Approved',
        message: 'Congratulations! Your seller account has been approved. You can now start selling.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        read: false
      },
      {
        id: 3,
        type: 'info',
        title: 'Pro Tip',
        message: 'Add high-quality product images and detailed descriptions to attract more customers.',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        read: false
      }
    ];
    
    console.log('✅ Seller notifications fetched:', notifications.length);
    
    res.json({ 
      success: true, 
      notifications: notifications 
    });
    
  } catch (error) {
    console.error('🔥 Seller notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch seller notifications: " + error.message 
    });
  }
});

// Check if seller needs password reset
app.get("/api/seller/check-password-status/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const db = req.app.locals.db;
    
    const seller = await db.collection("sellers").findOne({ email: email });
    
    if (!seller) {
      return res.status(404).json({ 
        success: false, 
        error: "Seller not found" 
      });
    }
    
    // Check if password is hashed
    const isHashed = seller.password && seller.password.length >= 50 && seller.password.startsWith('$2');
    const needsReset = !isHashed;
    
    res.json({ 
      success: true, 
      needsPasswordReset: needsReset,
      isHashed: isHashed,
      message: needsReset ? 
        "Your password needs to be reset for security reasons." : 
        "Your password is secure."
    });
    
  } catch (error) {
    console.error('🔥 Password status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Password status check failed: " + error.message 
    });
  }
});

// Admin Approval Endpoint for Sellers
app.post("/api/admin/seller/approve", async (req, res) => {
  try {
    const { sellerId, adminEmail } = req.body;
    
    if (!sellerId || !adminEmail) {
      return res.status(400).json({ 
        success: false, 
        error: "Seller ID and admin email are required" 
      });
    }
    
    const db = req.app.locals.db;
    
    // Update seller approval status
    const result = await db.collection("sellers").updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          approvalStatus: "approved",
          status: "approved",
          approvedDate: new Date(),
          approvedBy: adminEmail,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Seller not found" 
      });
    }
    
    console.log('✅ Seller approved:', { sellerId, adminEmail });
    
    res.json({ 
      success: true, 
      message: "Seller approved successfully" 
    });
    
  } catch (error) {
    console.error('🔥 APPROVE SELLER ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to approve seller: " + error.message 
    });
  }
});

// Get all sellers for admin management
app.get("/api/admin/sellers", async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    
    const db = req.app.locals.db;
    
    let filter = {};
    if (status !== "all") {
      filter.approvalStatus = status;
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
    console.error('🔥 GET SELLERS ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch sellers: " + error.message 
    });
  }
});

// Get dashboard statistics
app.get("/api/admin/stats", async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    const stats = {
      totalUsers: await db.collection("users").countDocuments(),
      totalSellers: await db.collection("sellers").countDocuments({ approvalStatus: "approved" }),
      pendingSellers: await db.collection("sellers").countDocuments({ approvalStatus: "pending" }),
      totalProducts: await db.collection("products").countDocuments(),
      pendingProducts: await db.collection("products").countDocuments({ status: "pending" }),
      totalOrders: await db.collection("orders").countDocuments()
    };

    // Calculate total revenue
    const revenueResult = await db.collection("orders").aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]).toArray();
    
    stats.totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({ success: true, stats });
  } catch (error) {
    console.error('🔥 STATS ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch statistics: " + error.message 
    });
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

// Add secure session-based authentication routes
app.use('/api/user', secureAuthRoutes);

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: "Backend is working - Updated v2",
    timestamp: new Date().toISOString(),
    routes: [
      '/api/user/register',
      '/api/user/login', 
      '/api/user/session',
      '/api/user/logout'
    ]
  });
});

// Simple test endpoint
app.get('/api/simple-test', (req, res) => {
  res.json({ 
    success: true, 
    message: "Simple test works",
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check request handling
app.post('/api/debug-register', (req, res) => {
  console.log('Debug register endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  res.json({ 
    success: true, 
    message: "Debug register works",
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Start server
connectToMongo().then(() => {
  // Make database available to routes
  app.locals.db = db;
  
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
