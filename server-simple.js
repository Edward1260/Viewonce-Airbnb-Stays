const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9002;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from root directory FIRST
app.use(express.static(__dirname));

// Handle uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

// Handle images directory  
app.use('/images', express.static(path.join(__dirname, 'images')));

// API Proxy - forward all /api requests to backend
// Forward to the same path without adding /api/v1 prefix (for minimal NestJS)
app.use('/api', (req, res) => {
    const targetPath = '/api' + req.url;
    const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: targetPath,
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            'Host': '127.0.0.1:3001',
            'Accept': 'application/json'
        }
    };

    console.log(`[PROXY] ${req.method} /api${req.url} -> http://127.0.0.1:3001${targetPath}`);

    const proxyReq = http.request(options, (proxyRes) => {
        let body = '';
        proxyRes.on('data', (chunk) => body += chunk);
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode);
            res.setHeader('Content-Type', 'application/json');
            res.send(body);
        });
    });

    proxyReq.on('error', (e) => {
        console.error('[PROXY ERROR]', e.message);
        res.status(502).json({ error: 'Bad Gateway', message: e.message });
    });

    // Get the raw body for proxying
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
        if (body) {
            proxyReq.write(body);
        }
        proxyReq.end();
    });
});

// Serve index/welcome for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Frontend pages: http://localhost:${PORT}`);
    console.log(`Backend API: http://localhost:3001`);
    console.log(`API Proxy: /api/* -> http://localhost:3001/api/v1/*`);
});
