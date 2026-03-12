const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = 9002;

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:3001/api',
    changeOrigin: true,
    pathRewrite: {
        '^/api': ''
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.url} to http://127.0.0.1:3001/api${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
}));

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
