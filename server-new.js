const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9002;

// Parse JSON body for POST requests
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Custom proxy middleware for API requests - using Node's http module
app.use('/api', (req, res) => {
    const backendPath = '/api/v1' + req.url;
    const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: backendPath,
        method: req.method,
        headers: {
            ...req.headers,
            host: '127.0.0.1:3001',
            'Content-Type': 'application/json'
        }
    };

    console.log(`Proxying ${req.method} ${req.url} -> http://127.0.0.1:3001${backendPath}`);

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode);
            // Copy headers from backend response
            Object.keys(proxyRes.headers).forEach(key => {
                if (key !== 'transfer-encoding') {
                    res.setHeader(key, proxyRes.headers[key]);
                }
            });
            res.send(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('Proxy error:', error.message);
        res.status(502).json({ error: 'Bad Gateway', message: 'Failed to connect to backend' });
    });

    // Forward body data
    if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
});

// Serve static files from root directory FIRST
app.use(express.static(__dirname));

// Handle uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

// Handle images directory  
app.use('/images', express.static(path.join(__dirname, 'images')));

// Define specific routes for HTML pages
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

app.get('/host-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'host-dashboard.html'));
});

app.get('/customer-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer-dashboard.html'));
});

app.get('/support-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'support-dashboard.html'));
});

app.get('/welcome.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

// Handle all other routes - serve welcome.html for SPA (only as fallback)
app.use((req, res) => {
    console.log(`Serving welcome.html for ${req.url}`);
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Backend: http://localhost:3001`);
    console.log(`API proxy: /api -> http://127.0.0.1:3001/api/v1`);
});
