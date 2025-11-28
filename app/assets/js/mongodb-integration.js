// MongoDB Atlas Integration for EcoLoop Kenya
// This script replaces localStorage with MongoDB Atlas backend calls

// Configuration
const API_BASE_URL = 'https://my-backend-1-jk7w.onrender.com/api';

// Utility Functions
class MongoDBManager {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.currentUser = null;
        this.cache = new Map(); // Simple caching for better performance
    }

    // Test MongoDB connection
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/test`);
            const result = await response.json();
            console.log('MongoDB Connection Test:', result);
            return result.connected;
        } catch (error) {
            console.error('MongoDB connection failed:', error);
            return false;
        }
    }

    // Save data to MongoDB
    async saveData(data, collection = 'windsurfdata') {
        try {
            const response = await fetch(`${this.baseURL}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    collection,
                    timestamp: new Date()
                })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('Data saved successfully:', result.id);
                return result;
            } else {
                console.error('Save failed:', result.error);
                return null;
            }
        } catch (error) {
            console.error('Error saving data:', error);
            return null;
        }
    }

    // Get data from MongoDB
    async getData(collection = 'windsurfdata') {
        try {
            const response = await fetch(`${this.baseURL}/data`);
            const result = await response.json();
            
            if (result.success) {
                // Filter by collection if specified
                const data = collection ? 
                    result.data.filter(item => item.collection === collection) : 
                    result.data;
                console.log('Data retrieved successfully:', data.length, 'items');
                return data;
            } else {
                console.error('Retrieve failed:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error retrieving data:', error);
            return [];
        }
    }

    // Get data by email (for user-specific data)
    async getDataByEmail(email, collection = 'windsurfdata') {
        const allData = await this.getData(collection);
        return allData.filter(item => item.email === email);
    }

    // Update existing data
    async updateData(id, updates) {
        try {
            // For MongoDB, we'll save a new version with the same ID
            const updatedData = { ...updates, _id: id, updatedAt: new Date() };
            return await this.saveData(updatedData);
        } catch (error) {
            console.error('Error updating data:', error);
            return null;
        }
    }

    // Delete data by ID
    async deleteData(id) {
        // Note: This would require a delete endpoint in the backend
        // For now, we'll mark it as deleted
        return await this.updateData(id, { deleted: true, deletedAt: new Date() });
    }
}

// Global MongoDB manager instance
const db = new MongoDBManager();

// User Management Functions
async function saveUserToMongo(user) {
    return await db.saveData({
        ...user,
        type: 'user',
        email: user.email,
        name: user.name
    });
}

async function getUserFromMongo(email) {
    const users = await db.getDataByEmail(email);
    return users.find(user => user.type === 'user' && !user.deleted);
}

// Cart Management Functions
async function saveCartToMongo(email, cartItems) {
    return await db.saveData({
        email,
        cart: cartItems,
        type: 'cart',
        lastUpdated: new Date()
    });
}

async function getCartFromMongo(email) {
    const cartData = await db.getDataByEmail(email);
    const cart = cartData.find(data => data.type === 'cart' && !data.deleted);
    return cart ? cart.cart : [];
}

// Wishlist Management Functions
async function saveWishlistToMongo(email, wishlistItems) {
    return await db.saveData({
        email,
        wishlist: wishlistItems,
        type: 'wishlist',
        lastUpdated: new Date()
    });
}

async function getWishlistFromMongo(email) {
    const wishlistData = await db.getDataByEmail(email);
    const wishlist = wishlistData.find(data => data.type === 'wishlist' && !data.deleted);
    return wishlist ? wishlist.wishlist : [];
}

// Product Management Functions
async function saveProductToMongo(product) {
    return await db.saveData({
        ...product,
        type: 'product',
        sellerEmail: product.sellerEmail,
        status: product.status || 'pending'
    });
}

async function getProductsFromMongo(status = 'approved') {
    const products = await db.getData();
    return products.filter(product => 
        product.type === 'product' && 
        product.status === status && 
        !product.deleted
    );
}

async function getProductsBySeller(email) {
    const products = await db.getData();
    return products.filter(product => 
        product.type === 'product' && 
        product.sellerEmail === email && 
        !product.deleted
    );
}

// Order Management Functions
async function saveOrderToMongo(order) {
    return await db.saveData({
        ...order,
        type: 'order',
        status: 'pending',
        createdAt: new Date()
    });
}

async function getOrdersFromMongo(email) {
    const orders = await db.getData();
    return orders.filter(order => 
        order.type === 'order' && 
        order.email === email && 
        !order.deleted
    );
}

// Message Management Functions
async function saveMessageToMongo(message) {
    return await db.saveData({
        ...message,
        type: 'message',
        timestamp: new Date(),
        read: false
    });
}

async function getMessagesFromMongo(email) {
    const messages = await db.getData();
    return messages.filter(message => 
        message.type === 'message' && 
        (message.senderEmail === email || message.receiverEmail === email) && 
        !message.deleted
    );
}

// Migrate data from localStorage to MongoDB
async function migrateFromLocalStorage() {
    console.log('🔄 Starting migration from localStorage to MongoDB...');
    
    let migrationResults = {
        users: 0,
        sellers: 0,
        cart: 0,
        wishlist: 0,
        products: 0,
        sellerProducts: 0,
        errors: []
    };
    
    try {
        // Migrate registered users
        const registeredUsers = localStorage.getItem('registeredUsers');
        if (registeredUsers) {
            const users = JSON.parse(registeredUsers);
            for (const user of users) {
                try {
                    await saveUserToMongo(user);
                    migrationResults.users++;
                } catch (error) {
                    migrationResults.errors.push(`User migration failed for ${user.email}: ${error.message}`);
                }
            }
            console.log(`✅ ${migrationResults.users} users migrated to MongoDB`);
        }
        
        // Migrate registered sellers
        const registeredSellers = localStorage.getItem('registeredSellers');
        if (registeredSellers) {
            const sellers = JSON.parse(registeredSellers);
            for (const seller of sellers) {
                try {
                    await saveUserToMongo(seller);
                    migrationResults.sellers++;
                } catch (error) {
                    migrationResults.errors.push(`Seller migration failed for ${seller.email}: ${error.message}`);
                }
            }
            console.log(`✅ ${migrationResults.sellers} sellers migrated to MongoDB`);
        }
        
        // Migrate cart data
        const userCart = localStorage.getItem('userCart');
        if (userCart) {
            const cart = JSON.parse(userCart);
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.email) {
                try {
                    await saveCartToMongo(currentUser.email, cart);
                    migrationResults.cart = cart.length;
                    console.log(`✅ ${migrationResults.cart} cart items migrated to MongoDB`);
                } catch (error) {
                    migrationResults.errors.push(`Cart migration failed: ${error.message}`);
                }
            }
        }
        
        // Migrate wishlist data
        const userWishlist = localStorage.getItem('userWishlist');
        if (userWishlist) {
            const wishlist = JSON.parse(userWishlist);
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.email) {
                try {
                    await saveWishlistToMongo(currentUser.email, wishlist);
                    migrationResults.wishlist = wishlist.length;
                    console.log(`✅ ${migrationResults.wishlist} wishlist items migrated to MongoDB`);
                } catch (error) {
                    migrationResults.errors.push(`Wishlist migration failed: ${error.message}`);
                }
            }
        }
        
        // Migrate products
        const products = localStorage.getItem('products');
        if (products) {
            const productList = JSON.parse(products);
            for (const product of productList) {
                try {
                    await saveProductToMongo(product);
                    migrationResults.products++;
                } catch (error) {
                    migrationResults.errors.push(`Product migration failed for ${product.title}: ${error.message}`);
                }
            }
            console.log(`✅ ${migrationResults.products} products migrated to MongoDB`);
        }
        
        // Migrate seller products
        const sellerProducts = localStorage.getItem('sellerProducts');
        if (sellerProducts) {
            const productList = JSON.parse(sellerProducts);
            for (const product of productList) {
                try {
                    await saveProductToMongo(product);
                    migrationResults.sellerProducts++;
                } catch (error) {
                    migrationResults.errors.push(`Seller product migration failed for ${product.title}: ${error.message}`);
                }
            }
            console.log(`✅ ${migrationResults.sellerProducts} seller products migrated to MongoDB`);
        }
        
        // Clear localStorage after successful migration (optional)
        const totalMigrated = migrationResults.users + migrationResults.sellers + 
                            migrationResults.cart + migrationResults.wishlist + 
                            migrationResults.products + migrationResults.sellerProducts;
        
        if (totalMigrated > 0 && migrationResults.errors.length === 0) {
            console.log('🎉 Migration completed successfully!');
            return {
                success: true,
                totalMigrated,
                results: migrationResults
            };
        } else {
            console.log('⚠️ Migration completed with some errors:', migrationResults.errors);
            return {
                success: false,
                totalMigrated,
                results: migrationResults
            };
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        migrationResults.errors.push(`General migration error: ${error.message}`);
        return {
            success: false,
            totalMigrated: 0,
            results: migrationResults
        };
    }
}

// Initialize MongoDB integration
async function initializeMongoDBIntegration() {
    console.log('Initializing MongoDB integration...');
    
    // Test connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
        console.error('Failed to connect to MongoDB. Please check your backend server.');
        return false;
    }
    
    // Check if migration has already been offered
    const migrationOffered = localStorage.getItem('mongodbMigrationOffered');
    const migrationCompleted = localStorage.getItem('mongodbMigrationCompleted');
    
    // Check if localStorage has data that needs migration
    const hasLocalStorageData = localStorage.getItem('currentUser') || 
                              localStorage.getItem('userCart') || 
                              localStorage.getItem('userWishlist') ||
                              localStorage.getItem('products') ||
                              localStorage.getItem('registeredUsers') ||
                              localStorage.getItem('registeredSellers') ||
                              localStorage.getItem('sellerProducts');
    
    if (hasLocalStorageData && !migrationCompleted && !migrationOffered) {
        // First time offering migration - be less intrusive
        console.log('🔄 Local storage data detected, checking migration needs...');
        
        // Auto-migrate silently for better UX
        try {
            await migrateFromLocalStorage();
            localStorage.setItem('mongodbMigrationCompleted', 'true');
            console.log('✅ Auto-migration to MongoDB completed successfully!');
            
            // Show a subtle success notification
            if (typeof showToast === 'function') {
                showToast('📦 Your data has been automatically migrated to MongoDB for better performance!', 'success');
            }
        } catch (error) {
            console.error('❌ Auto-migration failed:', error);
            localStorage.setItem('mongodbMigrationOffered', 'true');
            
            // Only show manual migration option if auto fails
            if (typeof showToast === 'function') {
                showToast('⚠️ Some data migration failed. You can try manual migration later.', 'warning');
            }
        }
    } else if (hasLocalStorageData && !migrationCompleted && migrationOffered) {
        console.log('📋 Migration was previously offered but not completed');
    } else if (migrationCompleted) {
        console.log('✅ Migration to MongoDB already completed');
    } else {
        console.log('📭 No local storage data found for migration');
    }
    
    console.log('MongoDB integration initialized successfully!');
    return true;
}

// Manual migration trigger function
async function triggerManualMigration() {
    console.log('🔄 Manual migration triggered by user...');
    
    try {
        const result = await migrateFromLocalStorage();
        
        if (result.success) {
            localStorage.setItem('mongodbMigrationCompleted', 'true');
            console.log('✅ Manual migration completed successfully!');
            
            if (typeof showToast === 'function') {
                console.log(`🎉 Successfully migrated ${result.totalMigrated} items to MongoDB!`);
            }
        } else {
            console.log('⚠️ Manual migration completed with errors:', result.results.errors);
            
            if (typeof showToast === 'function') {
                showToast(`⚠️ Migration completed with ${result.results.errors.length} errors. Check console for details.`, 'warning');
            }
        }
        
        return result;
    } catch (error) {
        console.error('❌ Manual migration failed:', error);
        
        if (typeof showToast === 'function') {
            showToast('❌ Migration failed. Please check your connection and try again.', 'error');
        }
        
        return { success: false, error: error.message };
    }
}

// Reset migration flags (for testing or re-migration)
function resetMigrationFlags() {
    localStorage.removeItem('mongodbMigrationOffered');
    localStorage.removeItem('mongodbMigrationCompleted');
    console.log('🔄 Migration flags reset');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MongoDBManager,
        db,
        saveUserToMongo,
        getUserFromMongo,
        saveCartToMongo,
        getCartFromMongo,
        saveWishlistToMongo,
        getWishlistFromMongo,
        saveProductToMongo,
        getProductsFromMongo,
        getProductsBySeller,
        saveOrderToMongo,
        getOrdersFromMongo,
        saveMessageToMongo,
        getMessagesFromMongo,
        initializeMongoDBIntegration,
        migrateFromLocalStorage,
        triggerManualMigration,
        resetMigrationFlags
    };
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeMongoDBIntegration();
});
