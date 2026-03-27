/* Enabled Supabase client for browser */
(function() {
  const SUPABASE_URL = 'https://ihezpsxioaizdxwovuot.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZXpwc3hpb2FpemR4d292dW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzg2MTQsImV4cCI6MjA5MDE1NDYxNH0.am-7lWOnZNDaXxDIRMHqEpbsQ7Ndtlw_FSgBXHa0aw0';

  // Load Supabase JS client
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
      const { createClient } = supabase;
      window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      console.log('Supabase client initialized:', window.supabase);
    };
    document.head.appendChild(script);
  }

  // Export for modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports.supabase = window.supabase;
  }
})();
