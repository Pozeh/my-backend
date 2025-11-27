// Test script to verify deployment
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: "Backend is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Test registration endpoint
app.post('/test-register', async (req, res) => {
  try {
    console.log('Test registration request received:', req.body);
    
    const { firstName, lastName, email, phone, password } = req.body;
    
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields",
        received: { firstName, lastName, email, phone, password: password ? '***' : 'missing' }
      });
    }
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("ecoloop");
    
    // Check if user exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      await client.close();
      return res.status(400).json({ 
        success: false, 
        error: "User already exists"
      });
    }
    
    // Create user
    const user = {
      firstName,
      lastName,
      email,
      phone,
      password, // In production, hash this
      type: "buyer",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("users").insertOne(user);
    await client.close();
    
    console.log('Test user created:', { email, id: result.insertedId });
    
    res.json({ 
      success: true, 
      message: "Test registration successful",
      userId: result.insertedId,
      user: { firstName, lastName, email, type: "buyer" }
    });
    
  } catch (error) {
    console.error('Test registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
