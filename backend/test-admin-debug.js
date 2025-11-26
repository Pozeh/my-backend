// Debug admin login issue
const http = require('http');

const ADMIN_CREDENTIALS = {
    email: 'pmuiruri9657@gmail.com',
    password: 'paul965757',
    name: 'Paul Muiruri'
};

// Test admin setup
function testAdminSetup() {
    const data = JSON.stringify(ADMIN_CREDENTIALS);
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/setup',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Setup Status: ${res.statusCode}`);
        let body = '';
        
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            console.log('Setup Response:', body);
            testAdminLogin();
        });
    });

    req.on('error', (error) => {
        console.error('Setup Error:', error);
    });

    req.write(data);
    req.end();
}

// Test admin login
function testAdminLogin() {
    const loginData = JSON.stringify({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Login Status: ${res.statusCode}`);
        let body = '';
        
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            console.log('Login Response:', body);
            checkDatabase();
        });
    });

    req.on('error', (error) => {
        console.error('Login Error:', error);
    });

    req.write(loginData);
    req.end();
}

// Check database contents
function checkDatabase() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/data',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`Data Status: ${res.statusCode}`);
        let body = '';
        
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('Total records:', data.length);
                
                // Look for admin records
                const adminRecords = data.filter(record => 
                    record.email === ADMIN_CREDENTIALS.email
                );
                
                console.log('Admin records found:', adminRecords.length);
                adminRecords.forEach(record => {
                    console.log('Admin record:', {
                        email: record.email,
                        password: record.password,
                        status: record.status,
                        collection: record.collection,
                        type: record.type
                    });
                });
                
            } catch (error) {
                console.error('Error parsing data:', error);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Data Error:', error);
    });

    req.end();
}

// Run tests
console.log('🔍 Testing admin endpoints...');
testAdminSetup();
