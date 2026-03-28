// Centralized configuration for the application - SUPABASE SERVERLESS VERSION
const config = {
    // Supabase Configuration
    SUPABASE_URL: 'https://oosbloogsjimcdsffjfy.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc2Jsb29nc2ppbWNkc2ZmamZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2Njg2MDEsImV4cCI6MjA5MDI0NDYwMX0.y78TPC4A1c4L0grcJg_cA4I7LNIeGjajXA1ChG0YlHQ',

    // Environment
    NODE_ENV: 'development',

    // Debugging
    DEBUG: true,
    VERSION: '11.0.0-supabase-direct',
    TIMESTAMP: Date.now(),
};

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
