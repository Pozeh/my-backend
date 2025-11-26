// Auto-start backend and create admin account
const { spawn } = require('child_process');
const http = require('http');

const ADMIN_CREDENTIALS = {
    email: 'pmuiruri9657@gmail.com',
    password: 'paul965757',
    name: 'Paul Muiruri'
};

// Start the backend server
console.log('🚀 Starting backend server...');
const server = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true
});

// Wait for server to start, then create admin account
setTimeout(async () => {
    console.log('⏳ Waiting for server to start...');
    
    // Check if server is running
    let serverReady = false;
    for (let i = 0; i < 10; i++) {
        try {
            const response = await fetch('http://localhost:3000/api/test');
            if (response.ok) {
                serverReady = true;
                console.log('✅ Backend server is running!');
                break;
            }
        } catch (error) {
            console.log(`⏳ Attempt ${i + 1}/10: Server not ready yet...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    if (serverReady) {
        console.log('🔧 Creating admin account...');
        
        try {
            const response = await fetch('http://localhost:3000/api/admin/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ADMIN_CREDENTIALS)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Admin account created successfully!');
                console.log('📧 Email:', ADMIN_CREDENTIALS.email);
                console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
                console.log('👤 Name:', ADMIN_CREDENTIALS.name);
                console.log('\n🎯 You can now login at: https://ecoloop-f93m.onrender.com/admin/admin-login.html');
                
                // Test login
                console.log('\n🔍 Testing admin login...');
                const loginResponse = await fetch('http://localhost:3000/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: ADMIN_CREDENTIALS.email,
                        password: ADMIN_CREDENTIALS.password
                    })
                });
                
                const loginResult = await loginResponse.json();
                
                if (loginResult.success) {
                    console.log('✅ Login test successful!');
                    console.log('👋 Welcome, Admin:', loginResult.admin.name);
                    console.log('🕐 Session created at:', loginResult.session.loginTime);
                } else {
                    console.log('❌ Login test failed:', loginResult.error);
                }
                
            } else {
                if (result.error && result.error.includes('already exists')) {
                    console.log('ℹ️ Admin account already exists');
                    console.log('📧 Email:', ADMIN_CREDENTIALS.email);
                    console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
                    console.log('\n🎯 You can login at: https://ecoloop-f93m.onrender.com/admin/admin-login.html');
                } else {
                    console.log('❌ Failed to create admin:', result.error);
                }
            }
        } catch (error) {
            console.log('❌ Error creating admin:', error.message);
        }
    } else {
        console.log('❌ Failed to start backend server');
    }
    
    console.log('\n🌐 Backend server is running at: http://localhost:3000');
    console.log('📱 Frontend available at: https://ecoloop-f93m.onrender.com');
    console.log('🔐 Admin login at: https://ecoloop-f93m.onrender.com/admin/admin-login.html');
    
}, 5000);

// Handle exit
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    server.kill();
    process.exit(0);
});
