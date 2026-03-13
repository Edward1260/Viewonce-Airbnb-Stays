// Configuration - VERSION 10 - Single Port (Backend serves Frontend)
const config = {
    // API Configuration - Backend runs on port 3001
    API_BASE_URL: 'http://localhost:3001/api/v1',

    // Frontend runs on port 9002
    FRONTEND_PORT: 9002,

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
