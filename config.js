// Centralized configuration for the application - SINGLE PORT VERSION
// Backend serves frontend on port 3001 - no separate frontend port needed
const config = {
// Backend API base URL - serves frontend static files
API_BASE_URL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api',

    // Environment
    NODE_ENV: 'development',

    // Enable debug logging in development
    DEBUG: true,

    // Force cache refresh - VERSION 10
    VERSION: '10.0.0-supabase',
    TIMESTAMP: Date.now(),
    CACHE_BUSTER: Math.random(),
    FORCE_REFRESH: true
};

// Supabase DISABLED - use backend APIs only
// config.SUPABASE_CONFIG = { ... }; // REMOVED - backend handles DB

// Make available globally immediately
if (typeof window !== 'undefined') {
    window.config = config;
    console.log('🔧 Config loaded - API_BASE_URL:', config.API_BASE_URL);
    console.log('🔧 NODE_ENV:', config.NODE_ENV);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
