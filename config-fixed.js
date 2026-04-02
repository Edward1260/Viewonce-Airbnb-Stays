// Configuration - VERSION 11.0 - Modern Environment & Security
const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const config = {
    // API Configuration - Dynamic detection for Vercel deployment
    // Uses NEXT_PUBLIC_ prefix for Next.js/Vercel compatibility
    // For Vercel deployment, ensure VITE_APP_API_URL is set as an environment variable during build,
    // or manually replace this placeholder with your deployed backend API URL.
    // Example: https://your-backend-api.vercel.app/api/v1
    API_BASE_URL: (typeof window !== 'undefined' && window.VITE_APP_API_URL) ||
        (isLocal ? 'http://localhost:3001/api/v1' : 'https://your-api-production-url.com/api/v1'),

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
