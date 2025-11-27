// JWT-based Authentication Routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'ecoloop-jwt-secret-key-change-in-production';

// Helper function to generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.type || 'user'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Helper function to verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// User Registration with JWT
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
        
        // Create new user
        const user = {
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
            status: "active",
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
        
        // Generate JWT token
        const token = generateToken({
            _id: result.insertedId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            type: "buyer"
        });
        
        // Store user data in MongoDB for reference
        await db.collection("activeTokens").insertOne({
            userId: result.insertedId.toString(),
            token: token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        
        res.json({ 
            success: true, 
            message: "Account created successfully",
            token: token,
            user: {
                id: result.insertedId,
                firstName: firstName,
                lastName: lastName,
                email: email,
                type: "buyer"
            }
        });
        
    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to register user" 
        });
    }
});

// User Login with JWT
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
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Store token in MongoDB
        await db.collection("activeTokens").insertOne({
            userId: user._id.toString(),
            token: token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        
        console.log('User login successful:', { 
            email, 
            name: `${user.firstName} ${user.lastName}`,
            timestamp: new Date().toISOString() 
        });
        
        res.json({ 
            success: true, 
            message: "Login successful",
            token: token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                type: user.type || "buyer",
                lastLogin: new Date()
            }
        });
        
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Login failed. Please try again." 
        });
    }
});

// Verify JWT Token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: "No token provided" 
            });
        }
        
        // Verify token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ 
                success: false, 
                error: "Invalid or expired token" 
            });
        }
        
        // Check if token exists in MongoDB
        const db = req.app.locals.db;
        const tokenRecord = await db.collection("activeTokens").findOne({ 
            token: token,
            userId: decoded.userId
        });
        
        if (!tokenRecord) {
            return res.status(401).json({ 
                success: false, 
                error: "Token not found or expired" 
            });
        }
        
        // Get user from database
        const user = await db.collection("users").findOne({ 
            _id: new ObjectId(decoded.userId),
            status: "active"
        });

        if (!user) {
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
                type: user.type || "buyer",
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Token verification failed" 
        });
    }
});

// Logout (Remove JWT from MongoDB)
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            // Remove token from MongoDB
            const db = req.app.locals.db;
            await db.collection("activeTokens").deleteOne({ token: token });
        }
        
        res.json({ 
            success: true, 
            message: "Logged out successfully" 
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
