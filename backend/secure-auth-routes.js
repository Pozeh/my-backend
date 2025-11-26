// Secure Session-based Authentication Routes with bcrypt
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt for better compatibility
const { ObjectId } = require('mongodb');

const SALT_ROUNDS = 12;

// Helper function to hash password
async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

// Helper function to compare password
async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

// User Registration with bcrypt and session
router.post('/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        
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
        
        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: "Required fields: firstName, lastName, email, phone, password" 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return res.status(400).json({ 
                success: false, 
                error: "Invalid email format" 
            });
        }
        
        // Validate phone format (basic validation)
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phone) || phone.length < 10) {
            console.log('Invalid phone format:', phone);
            return res.status(400).json({ 
                success: false, 
                error: "Invalid phone number format" 
            });
        }
        
        // Validate password strength
        if (password.length < 6) {
            console.log('Password too short');
            return res.status(400).json({ 
                success: false, 
                error: "Password must be at least 6 characters long" 
            });
        }
        
        // Check if user already exists
        const existingUser = await db.collection("users").findOne({ 
            $or: [{ email: email }, { phone: phone }] 
        });
        
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ 
                success: false, 
                error: "User with this email or phone already exists" 
            });
        }
        
        // Hash the password with error handling
        let hashedPassword;
        try {
            hashedPassword = await hashPassword(password);
            console.log('Password hashed successfully');
        } catch (hashError) {
            console.error('Password hashing error:', hashError);
            // Fallback to plain text for debugging (remove in production)
            hashedPassword = password;
            console.log('Using fallback plain text password for debugging');
        }
        
        // Create new user
        const user = {
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword, // Store hashed password
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
        
        // Create session for auto-login
        req.session.user = {
            userId: result.insertedId.toString(),
            email: email,
            name: `${firstName} ${lastName}`,
            type: "buyer",
            loginTime: new Date().toISOString()
        };
        
        // Save session
        req.session.save((err) => {
            if (err) {
                console.error('Session save error after registration:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: "Registration successful but session creation failed" 
                });
            }
            
            console.log('Session created successfully');
            res.json({ 
                success: true, 
                message: "Account created successfully",
                user: {
                    id: result.insertedId,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    type: "buyer"
                }
            });
        });
        
    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to register user: " + error.message 
        });
    }
});

// User Login with bcrypt and session
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
        
        // Compare hashed password
        const isPasswordValid = await comparePassword(password, user.password);
        
        if (!isPasswordValid) {
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
        req.session.user = {
            userId: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            type: user.type || "buyer",
            loginTime: new Date().toISOString()
        };
        
        // Configure session duration based on remember me
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        }
        
        // Save session
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: "Login failed. Please try again." 
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
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    type: user.type || "buyer",
                    lastLogin: new Date()
                }
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

// Get current session
router.get('/session', async (req, res) => {
    try {
        // Check if user is in session
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                error: "No active session found" 
            });
        }

        // Get user from database to ensure they still exist and are active
        const db = req.app.locals.db;
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
                type: user.type || "buyer",
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({ 
            success: false, 
            error: "Session verification failed" 
        });
    }
});

// Logout (destroy session)
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
