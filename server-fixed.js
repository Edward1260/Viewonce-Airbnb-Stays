const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 9002;

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Parse JSON body for POST requests
app.use(express.json());

// Custom proxy middleware for API requests
app.use('/api', (req, res) => {
    const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: '/api/v1' + req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: '127.0.0.1:3001'
        }
    };

    console.log(`Proxying ${req.method} /api${req.url} to http://127.0.0.1:3001/api/v1${req.url}`);

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode);
            Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });
            res.send(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy error', message: error.message });
    });

    if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Handle uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

// Handle images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Refactored HTML file requests
const pageRoutes = {
    '/dashboard': 'admin-dashboard.html',
    '/login': 'login.html',
    '/signup': 'signup.html',
    '/host-dashboard': 'host-dashboard.html',
    '/customer-dashboard': 'customer-dashboard.html',
    '/support-dashboard': 'support-dashboard.html'
};

Object.keys(pageRoutes).forEach(route => {
    const file = pageRoutes[route];
    // Handle both /route and /route.html
    app.get([route, `${route}.html`], (req, res) => {
        res.sendFile(path.join(__dirname, file));
    });
});

// Handle all other routes - serve welcome.html for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Admin dashboard available at http://0.0.0.0:${PORT}/dashboard.html`);
    console.log(`Access from phone: http://<your-ip>:${PORT}`);
    console.log(`API proxy: /api -> http://127.0.0.1:3001/api/v1`);
});
