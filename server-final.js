const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9002;

// Middleware to parse JSON bodies
app.use(express.json());

// API Proxy - MUST be defined BEFORE static file serving
app.use('/api', (req, res) => {
    const targetPath = '/api/v1' + req.url;
    const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: targetPath,
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            'Host': '127.0.0.1:3001'
        }
    };

    console.log(`[PROXY] ${req.method} /api${req.url} -> http://127.0.0.1:3001${targetPath}`);

    const proxyReq = http.request(options, (proxyRes) => {
        let body = '';
        proxyRes.on('data', (chunk) => body += chunk);
        proxyRes.on('end', () => {
            console.log(`[PROXY] Backend response: ${proxyRes.statusCode}`);
            res.status(proxyRes.statusCode);
            res.setHeader('Content-Type', 'application/json');
            res.send(body);
        });
    });

    proxyReq.on('error', (e) => {
        console.error('[PROXY ERROR]', e.message);
        res.status(502).json({ error: 'Bad Gateway', message: e.message });
    });

    if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
});

// Serve static files from root directory AFTER API proxy
app.use(express.static(__dirname));

// Handle uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

// Handle images directory  
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve index/welcome for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API Proxy: /api/* -> http://localhost:3001/api/v1/*`);
});
