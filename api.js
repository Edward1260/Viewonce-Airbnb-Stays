// Centralized Supabase API client for the ViewOnce Airbnb Stays App

// Expose API functions globally via window.api
window.api = {
  // Authentication via Supabase Auth
  login: async (credentials) => {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    if (error) throw error;

    // Fetch associated role from profiles table
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    return { 
      user: { ...data.user, role: profile?.role || 'customer' }, 
      session: data.session 
    };
  },

  signup: async (userData) => {
    const { data, error } = await window.supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone
        }
      }
    });
    if (error) throw error;

    // Initialize profile with role
    if (data.user) {
      await window.supabase.from('profiles').upsert({
        id: data.user.id,
        role: userData.role || 'customer',
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        is_active: true
      });
    }

    return { 
      user: { ...data.user, role: userData.role || 'customer' }, 
      session: data.session 
    };
  },

  logout: async () => {
    await window.supabase.auth.signOut();
  },

  getProfile: async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return { ...user, ...profile };
  },

  // Users
  getUsers: async (role) => {
    let query = window.supabase.from('profiles').select('*');
    if (role) query = query.eq('role', role);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Properties
  getProperties: async (filters = {}) => {
    let query = window.supabase.from('properties').select('*');
    if (filters.location) query = query.ilike('location', `%${filters.location}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getAllProperties: async () => {
    const { data, error } = await window.supabase.from('properties').select('*');
    if (error) throw error;
    return data;
  },

  createProperty: async (propData) => {
    const { data, error } = await window.supabase.from('properties').insert([propData]).select();
    if (error) throw error;
    return data[0];
  },

  updateProperty: async (id, updateData) => {
    const { data, error } = await window.supabase.from('properties').update(updateData).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  deleteProperty: async (id) => {
    const { error } = await window.supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
  },

  // Bookings
  getBookings: async () => {
    const { data, error } = await window.supabase.from('bookings').select('*, properties(*)');
    if (error) throw error;
    return data;
  },

  createBooking: async (bookingData) => {
    // Calculate commission (10% platform fee)
    const commissionRate = 0.10;
    const commission = bookingData.total_price * commissionRate;
    const netAmount = bookingData.total_price - commission;

    const { data: booking, error: bError } = await window.supabase
      .from('bookings')
      .insert([bookingData])
      .select();
    
    if (bError) throw bError;

    // Create a matching payment record
    const { error: pError } = await window.supabase.from('payments').insert([{
      booking_id: booking[0].id,
      amount: bookingData.total_price,
      commission: commission,
      net_amount: netAmount,
      status: 'pending'
    }]);

    if (pError) throw pError;
    return booking[0];
  },

  // Trigger M-Pesa Payout via Edge Function
  processPayout: async (payoutId) => {
    const { data, error } = await window.supabase.functions.invoke('mpesa-payout', {
      body: { payoutId }
    });
    
    if (error) throw error;
    return data;
  },

  // AI Chat Simulation (Since this is now purely serverless)
  sendAIMessage: async (message) => {
    return { 
      reply: "I am your ViewOnce AI, currently running in serverless mode. How can I help with your luxury stay?",
      timestamp: new Date().toISOString()
    };
  },

  // Real-time Subscriptions using Supabase Channels
  registerPropertyRefreshCallback: (cb) => {
    return window.supabase
      .channel('public:properties')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, payload => cb(payload))
      .subscribe();
  }
};