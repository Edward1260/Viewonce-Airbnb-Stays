// Test frontend proxy - calls through port 9002
const http = require('http');

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Test signup through frontend proxy (port 9002)
async function testProxySignup() {
  const userData = JSON.stringify({
    email: 'proxottest@example.com',
    password: 'Password123',
    firstName: 'Proxy',
    lastName: 'Test',
    phone: '5559998888',
    role: 'customer'
  });

  const options = {
    hostname: 'localhost',
    port: 9002,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': userData.length
    }
  };

  console.log('Testing frontend proxy (port 9002) -> backend (port 3001)...');
  console.log('Calling http://localhost:9002/api/auth/signup');
  try {
    const result = await makeRequest(options, userData);
    console.log('Proxy signup result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Proxy signup error:', error);
  }
}

// Run test
testProxySignup();
