/* Browser-compatible Supabase client using CDN */
(function() {
  // DISABLED - Use backend APIs via config.API_BASE_URL
  // window.SUPABASE_CONFIG = { ... }; // Backend handles DB operations
  console.warn('Supabase disabled - using backend API at', window.config?.API_BASE_URL);

  // Load Supabase if not already loaded
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
      // Supabase disabled - backend API only
      window.supabase = null;
      console.log('Supabase DISABLED - Backend API mode');
    };
    document.head.appendChild(script);
  }

  // Export for modules too
  if (typeof module !== 'undefined' && module.exports) {
    module.exports.supabase = window.supabase;
  }
})();
