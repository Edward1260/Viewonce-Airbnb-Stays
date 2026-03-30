/* Supabase client for Airbnb Stays App - Updated Credentials */
(function() {
  const SUPABASE_URL = 'https://oosbloogsjimcdsffjfy.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc2Jsb29nc2ppbWNkc2ZmamZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2Njg2MDEsImV4cCI6MjA5MDI0NDYwMX0.y78TPC4A1c4L0grcJg_cA4I7LNIeGjajXA1ChG0YlHQ';

  // Load Supabase JS client v2
  // Supabase readiness promise
  window.supabaseReady = new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve(window.supabase);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = function() {
      try {
        const { createClient } = window.supabase;
        window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            storage: localStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            flowType: 'pkce'
          }
        });
        console.log('✅ Supabase client initialized:', SUPABASE_URL);
        
        // Auto-sync profile on auth state change
        window.supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await syncUserProfile(session.user);
          }
        });
        
        resolve(window.supabase);
      } catch (error) {
        console.error('❌ Supabase client creation failed:', error);
        reject(error);
      }
    };
    script.onerror = function() {
      console.error('❌ Supabase CDN script failed to load');
      reject(new Error('Supabase script load failed'));
    };
    document.head.appendChild(script);
  });

  // Helper: Sync auth.users → profiles table
  async function syncUserProfile(user) {
    if (!user) return;
    const metadata = user.user_metadata || {};
    const { error } = await window.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: metadata.full_name || metadata.first_name + ' ' + metadata.last_name || '',
        role: metadata.role || 'customer',
        is_active: true,
        phone: metadata.phone || ''
      }, { onConflict: 'id' });
    if (error) console.error('Profile sync error:', error);
    else console.log('✅ Profile synced for user:', user.id);
  }

  // Export globally
  window.syncUserProfile = syncUserProfile;

  // Module export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { supabase: window.supabase, syncUserProfile };
  }
})();
