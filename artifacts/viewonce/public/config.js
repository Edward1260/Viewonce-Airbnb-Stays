// ViewOnce Configuration — v12.0
// Dynamically resolves the API base URL for any environment:
//   • localhost dev  → Express server on :8080
//   • Replit dev     → Vite dev-server proxy forwards /api → :8080
//   • Production     → same-origin /api (deployed API server)
(function () {
  'use strict';

  var host = typeof window !== 'undefined' ? window.location.hostname : '';
  var isLocalhost = host === 'localhost' || host === '127.0.0.1';

  var config = {
    // Relative /api works in ALL environments:
    //   - Vite dev: proxied to Express :8080 (see vite.config.ts)
    //   - Production static: served behind the same Replit proxy as the API
    API_BASE_URL: isLocalhost ? 'http://localhost:8080/api' : '/api',

    FRONTEND_PORT: 9002,
    ENV: isLocalhost ? 'development' : 'production',
    DEBUG: isLocalhost,
    TIMEOUT: 15000,
    VERSION: '12.0.0',
    TIMESTAMP: Date.now(),
  };

  if (typeof window !== 'undefined') {
    window.config = config;
    if (config.DEBUG) console.log('🔧 Config loaded:', config);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  }
})();
