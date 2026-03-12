// Centralized configuration for the application - SINGLE PORT VERSION
// Backend serves frontend on port 3001 - no separate frontend port needed
const config = {
    // API Configuration - Use relative URL to leverage the proxy.
    // All API calls will be prefixed with /api and handled by the server's proxy.
    API_BASE_URL: '/api',

    // Environment
    NODE_ENV: 'development',

    // Enable debug logging in development
    DEBUG: true,

    // Force cache refresh - VERSION 10
    VERSION: '10.0.0-single-port',
    TIMESTAMP: Date.now(),
    CACHE_BUSTER: Math.random(),
    FORCE_REFRESH: true
};

// Make available globally immediately
if (typeof window !== 'undefined') {
    window.config = config;
    console.log('🔧 Config loaded:', config);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
