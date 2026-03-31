// Configuration - VERSION 10.1 - Environment Variable Support
const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const config = {
    // API Configuration - Dynamic detection for Vercel deployment
    // Uses NEXT_PUBLIC_ prefix for Next.js/Vercel compatibility
    API_BASE_URL: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 
        (isLocal ? 'http://localhost:3001/api/v1' : '/api/v1'),

    // Frontend runs on port 9002
    FRONTEND_PORT: 9002,

    // Environment
    NODE_ENV: 'development',

    // Enable debug logging in development
    DEBUG: isLocal,

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
