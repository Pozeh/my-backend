// Create new admin credentials
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createNewAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('ecoloop');
    
    // New admin credentials
    const newAdmin = {
      email: 'admin@ecoloop.com',
      password: 'EcoLoopAdmin2024!', // Change this in production
      name: 'EcoLoop Administrator',
      role: 'admin',
      status: 'active',
      permissions: ['users', 'sellers', 'products', 'orders', 'analytics'],
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0
    };
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admins').findOne({ email: newAdmin.email });
    
    if (existingAdmin) {
      console.log('Admin already exists, updating credentials...');
      await db.collection('admins').updateOne(
        { email: newAdmin.email },
        { 
          $set: {
            password: newAdmin.password,
            name: newAdmin.name,
            role: newAdmin.role,
            status: newAdmin.status,
            permissions: newAdmin.permissions,
            updatedAt: new Date()
          }
        }
      );
      console.log('Admin credentials updated successfully!');
    } else {
      // Create new admin
      const result = await db.collection('admins').insertOne(newAdmin);
      console.log('New admin created successfully!');
      console.log('Admin ID:', result.insertedId);
    }
    
    console.log('\n=== ADMIN CREDENTIALS ===');
    console.log('Email:', newAdmin.email);
    console.log('Password:', newAdmin.password);
    console.log('==========================\n');
    
    // Verify admin was created
    const verifyAdmin = await db.collection('admins').findOne({ email: newAdmin.email });
    if (verifyAdmin) {
      console.log('✅ Admin verification successful!');
      console.log('Admin details:', {
        email: verifyAdmin.email,
        name: verifyAdmin.name,
        role: verifyAdmin.role,
        status: verifyAdmin.status,
        createdAt: verifyAdmin.createdAt
      });
    } else {
      console.log('❌ Admin verification failed!');
    }
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

createNewAdmin();
