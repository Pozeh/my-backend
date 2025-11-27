// Session-based Authentication Routes
const express = require('express');
const router = express.Router();

// User Registration with Session Support
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      streetAddress,
      city,
      state,
      postalCode,
      country,
      preferences,
      notifications,
      dateOfBirth,
      gender
    } = req.body;
    
    const db = req.app.locals.db;
    
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
    
    // Create new user (without password hashing for now)
    const user = {
      // Role and Status
      role: "user",
      status: "active",
      
      // Personal Details
      firstName,
      lastName,
      email,
      phone,
      password, // In production, hash this with bcrypt
      streetAddress,
      city,
      state,
      postalCode,
      country,
      preferences: preferences || {
        categories: [],
        priceRange: null,
        brands: [],
        notifications: true
      },
      notifications: notifications !== false,
      dateOfBirth,
      gender,
      type: "buyer",
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
    
    // Auto-login after registration - create session
    req.session.user = {
      userId: result.insertedId.toString(),
      email: email,
      name: `${firstName} ${lastName}`,
      role: "user",
      loginTime: new Date().toISOString()
    };
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error after registration:', err);
        return res.status(500).json({ 
          success: false, 
          error: "Registration successful but session creation failed" 
        });
      }
      
      res.json({ 
        success: true, 
        message: "User registered and logged in successfully",
        userId: result.insertedId,
        user: req.session.user
      });
    });
    
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to register user" 
    });
  }
});

// User Login with Session Support
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    const db = req.app.locals.db;
    
    // Find user
    const user = await db.collection("users").findOne({ 
      email: email, 
      status: "active"
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid email or password" 
      });
    }
    
    // Simple password comparison (in production, use bcrypt)
    if (user.password !== password) {
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
    
    // Store user in session
    req.session.user = {
      userId: user._id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: "user",
      loginTime: new Date().toISOString()
    };
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          success: false, 
          error: "Session creation failed" 
        });
      }
      
      console.log('User login successful:', { 
        email, 
        name: `${user.firstName} ${user.lastName}`,
        timestamp: new Date().toISOString() 
      });
      
      res.json({ 
        success: true, 
        message: "Login successful",
        user: req.session.user
      });
    });
    
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Login failed. Please try again." 
    });
  }
});

// Verify Authentication Status
router.get('/verify', async (req, res) => {
  try {
    // Check if user is in session
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        error: "No active session found" 
      });
    }

    const db = req.app.locals.db;
    
    // Get user from database to ensure they still exist and are active
    const user = await db.collection("users").findOne({ 
      _id: new ObjectId(req.session.user.userId),
      status: "active"
    });

    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: "User not found or inactive" 
      });
    }

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        type: user.type,
        status: user.status,
        lastLogin: user.lastLogin,
        sessionInfo: req.session.user
      }
    });
    
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Authentication verification failed" 
    });
  }
});

// Logout and Clear Session
router.post('/logout', async (req, res) => {
  try {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ 
          success: false, 
          error: "Logout failed" 
        });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      
      res.json({ 
        success: true, 
        message: "Logged out successfully" 
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Logout failed" 
    });
  }
});

module.exports = router;
