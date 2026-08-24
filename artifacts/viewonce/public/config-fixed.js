// Configuration - VERSION 11.0 - Modern Environment & Security
const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const config = {
    // Same-origin API in Replit; local development uses the API workflow directly.
    API_BASE_URL: isLocal ? 'http://localhost:8080/api' : '/api',

    // Frontend runs on port 9002
    FRONTEND_PORT: 9002,

    // Environment
    ENV: isLocal ? 'development' : 'production',

    // Enable debug logging in development
    DEBUG: isLocal,
    TIMEOUT: 15000, // API request timeout in ms
    
    // Force cache refresh - VERSION 10
    VERSION: '11.0.0-modern-core',
    TIMESTAMP: Date.now(),
    CACHE_BUSTER: Date.now(),
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
