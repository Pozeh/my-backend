const { MongoClient } = require('mongodb');

// MongoDB connection string from .env.example
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://ecoloop:paul965757@cluster0.osksekt.mongodb.net/?appName=Cluster0';

async function clearUsersCollection() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected to MongoDB successfully!');
        
        const db = client.db();
        const usersCollection = db.collection('users');
        
        // Count users before deletion
        const userCount = await usersCollection.countDocuments();
        console.log(`Found ${userCount} users in the collection`);
        
        if (userCount > 0) {
            // Delete all users
            const deleteResult = await usersCollection.deleteMany({});
            console.log(`✅ Successfully deleted ${deleteResult.deletedCount} users from the collection`);
            
            // Verify deletion
            const remainingCount = await usersCollection.countDocuments();
            console.log(`Remaining users: ${remainingCount}`);
        } else {
            console.log('ℹ️ No users found in the collection - already clean');
        }
        
        // Also clear any sessions if they exist
        const sessionsCollection = db.collection('sessions');
        const sessionCount = await sessionsCollection.countDocuments();
        if (sessionCount > 0) {
            await sessionsCollection.deleteMany({});
            console.log(`✅ Cleared ${sessionCount} sessions`);
        }
        
        console.log('🎉 Database cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Run the cleanup
clearUsersCollection();
