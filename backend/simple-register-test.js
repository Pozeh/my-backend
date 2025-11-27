// Simple registration test without bcrypt
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(express.json());

// Simple registration endpoint
app.post('/simple-register', async (req, res) => {
  try {
    console.log('=== SIMPLE REGISTRATION TEST ===');
    console.log('Headers:', req.headers);
    console.log('Raw Body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    const { firstName, lastName, email, phone, password } = req.body;
    
    console.log('Extracted fields:', { firstName, lastName, email, phone, password: password ? '***' : 'missing' });
    
    if (!firstName || !lastName || !email || !phone || !password) {
      console.log('Validation failed - missing fields');
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
    
    console.log('Connected to MongoDB');
    
    // Check if user exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      await client.close();
      console.log('User already exists:', email);
      return res.status(400).json({ 
        success: false, 
        error: "User already exists"
      });
    }
    
    // Create user without password hashing for testing
    const user = {
      firstName,
      lastName,
      email,
      phone,
      password, // Plain text for testing only
      type: "buyer",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Creating user:', { firstName, lastName, email });
    
    const result = await db.collection("users").insertOne(user);
    await client.close();
    
    console.log('User created successfully:', { email, id: result.insertedId });
    
    res.json({ 
      success: true, 
      message: "Simple registration successful",
      userId: result.insertedId,
      user: { firstName, lastName, email, type: "buyer" }
    });
    
  } catch (error) {
    console.error('Simple registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
});
