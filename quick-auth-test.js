// Quick authentication test script
const { default: fetch } = require('node-fetch');

const BACKEND_URL = 'https://my-backend-1-jk7w.onrender.com';

// Test user data
const testUser = {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alicejohnson@ecoloop.com',
    phone: '+254700555777',
    password: 'TestPassword123!'
};

async function runQuickTest() {
    console.log('🚀 Starting Quick Authentication Test...\n');
    
    try {
        // Step 1: Test Registration
        console.log('📝 Step 1: Testing Registration...');
        const regResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        
        const regData = await regResponse.json();
        console.log(`Status: ${regResponse.status}`);
        console.log(`Response: ${JSON.stringify(regData, null, 2)}\n`);
        
        if (!regResponse.ok) {
            throw new Error(`Registration failed: ${regData.error}`);
        }
        
        // Step 2: Test Login
        console.log('🔐 Step 2: Testing Login...');
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: testUser.email, 
                password: testUser.password 
            })
        });
        
        const loginData = await loginResponse.json();
        console.log(`Status: ${loginResponse.status}`);
        console.log(`Response: ${JSON.stringify(loginData, null, 2)}\n`);
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginData.error}`);
        }
        
        // Extract cookies from login response
        const cookies = loginResponse.headers.get('set-cookie');
        console.log(`Cookies received: ${cookies}\n`);
        
        // Step 3: Test Auth Status
        console.log('👤 Step 3: Testing Auth Status...');
        const authResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': cookies || ''
            }
        });
        
        const authData = await authResponse.json();
        console.log(`Status: ${authResponse.status}`);
        console.log(`Response: ${JSON.stringify(authData, null, 2)}\n`);
        
        if (!authResponse.ok) {
            throw new Error(`Auth verification failed: ${authData.error}`);
        }
        
        // Step 4: Test Logout
        console.log('🚪 Step 4: Testing Logout...');
        const logoutResponse = await fetch(`${BACKEND_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 
                'Cookie': cookies || ''
            }
        });
        
        const logoutData = await logoutResponse.json();
        console.log(`Status: ${logoutResponse.status}`);
        console.log(`Response: ${JSON.stringify(logoutData, null, 2)}\n`);
        
        if (!logoutResponse.ok) {
            throw new Error(`Logout failed: ${logoutData.error}`);
        }
        
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ Registration working');
        console.log('✅ Login working');
        console.log('✅ Auth verification working');
        console.log('✅ Logout working');
        console.log('\n🎊 Authentication system is fully functional!');
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        process.exit(1);
    }
}

// Run the test
runQuickTest();
