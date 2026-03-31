// Centralized Supabase API client for the ViewOnce Airbnb Stays App

// Expose API functions globally via window.api
const api = {
  // Internal state for caching and real-time updates
  _propertyCache: null,
  _propertyCacheTime: null,
  _CACHE_DURATION: 30000, // 30 seconds
  _propertyRefreshCallbacks: [],
  baseUrl: window.config.API_BASE_URL, // Initialize baseUrl from config

  // Centralized Request Wrapper with Error Handling
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${api.baseUrl}${endpoint}`, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error);
      if (window.showToast) window.showToast(error.message, 'error');
      throw error;
    }
  },

  // Authentication via Supabase Auth
  login: async (credentials) => {
    const { data, error } = await window.supabase.auth.signInWithPassword(credentials);
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
  }, // End login

  // Standard Signup (matching script-fixed.js expectations)
  signup: async (userData) => {
    const { data, error } = await window.supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: { full_name: userData.name, phone: userData.phone }
      }
    });
    if (error) throw error;

    // Default role for new signups is customer
    return { user: { ...data.user, role: 'customer' }, session: data.session };
  },

  // Step 1: Request OTP for Signup
  requestOtpSignup: async (userData) => {
    // This will call your NestJS backend endpoint to send OTP
    return api.request('/auth/signup/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
  },

  // Step 2: Verify OTP and complete Signup
  verifyOtpSignup: async (email, otp, sessionId) => {
    // This will call your NestJS backend endpoint to verify OTP and finalize user creation
    return api.request('/auth/signup/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, sessionId })
    });
  },

  // Resend OTP
  resendOtp: async (email, sessionId) => {
    // This will call your NestJS backend endpoint to resend OTP
    return api.request('/auth/signup/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId })
    });
  },

  logout: async () => {
    // 1. Sign out from Supabase if applicable
    if (window.supabase?.auth) await window.supabase.auth.signOut();

    // 2. Clear LocalStorage for the legacy frontend parts
    localStorage.clear();

    // 3. Redirect to the Next.js logout handler to clear cookies
    window.location.href = '/logout';
  }, // End logout

  // Verify platform master role via secure endpoint
  verifyMasterRole: async () => {
    return api.request('/auth/verify-master', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
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
    let endpoint = '/users';
    if (role) endpoint += `?role=${role}`;
    return api.request(endpoint, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
  },

  // Admin: Create or update a user manually
  createUser: async (userData) => {
    return api.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(userData)
    });
  },

  // Properties
  getProperties: async (filters = {}) => {
    let endpoint = '/properties';
    const params = new URLSearchParams(filters);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return api.request(endpoint);
  },

  getAllProperties: async () => {
    return api.request('/properties');
  },

  createProperty: async (propData) => {
    const result = await api.request('/properties', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(propData)
    });
    api._propertyCache = null; // Invalidate cache
    if (api.notifyPropertyRefresh) api.notifyPropertyRefresh();
    return result;
  },

  updateProperty: async (id, updateData) => {
    const result = await api.request(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    api._propertyCache = null; // Invalidate cache
    if (api.notifyPropertyRefresh) api.notifyPropertyRefresh();
    return result;
  },

  deleteProperty: async (id) => {
    await api.request(`/properties/${id}`, { method: 'DELETE' });
    api._propertyCache = null; // Invalidate cache
    if (api.notifyPropertyRefresh) api.notifyPropertyRefresh();
  },

  // Bookings
  getBookings: async () => {
    return api.request('/bookings');
  },

  // Admin: Get all payments/transactions across the platform
  getAllPayments: async () => {
    return api.request('/payments');
  },

  createBooking: async (bookingData) => {
    // Financial calculations and payment record creation moved to backend for security
    const booking = await api.request('/bookings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(bookingData)
    });
    return booking;
  },

  // Support API
  getSupportStats: async () => { // Assuming backend provides aggregated stats
    const tickets = await api.request('/support/tickets/stats');
    return {
      activeCount: tickets.activeCount || 0,
      resolvedCount: tickets.filter(t => t.status === 'resolved').length,
      totalCount: tickets.length
    };
  },

  getSupportTickets: async (filters = {}) => {
    let query = window.supabase.from('support_tickets').select('*, customer:profiles!customer_id(full_name)');
    let endpoint = '/support/tickets';
    const params = new URLSearchParams(filters);
    if (params.toString()) endpoint += `?${params.toString()}`;
    const data = await api.request(endpoint);
    return data.map(t => ({ ...t, customer: t.customer?.full_name || 'Guest' })); // Assuming backend joins customer data
  },

  createSupportTicket: async (ticketData) => {
    const { data: { user } } = await window.supabase.auth.getUser();
    
    // Auto-categorize based on subject before insertion
    const { category } = await api.categorizeTicket(ticketData.subject);
    
    return api.request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: user.id,
        ...ticketData,
        category
      })
    });
  },

  getSupportTicket: async (id) => {
    const ticket = await api.request(`/support/tickets/${id}`);
    const comments = await api.request(`/support/tickets/${id}/comments`);
    return { ...ticket, comments };
  },

  addSupportComment: async (ticketId, { content, isInternal = false }) => {
    const { data: { user } } = await window.supabase.auth.getUser();
    return api.request('/support/comments', {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId, author_id: user.id, content, is_internal: isInternal })
    });
  },

  getKnowledgeBaseArticles: async () => {
    const { data, error } = await window.supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  createKnowledgeBaseArticle: async (articleData) => {
    return api.request('/knowledge-base', {
      method: 'POST',
      body: JSON.stringify(articleData)
    });
  },

  updateKnowledgeBaseArticle: async (id, articleData) => {
    return api.request(`/knowledge-base/${id}`, {
      method: 'PUT',
      body: JSON.stringify(articleData)
    });
  },

  deleteKnowledgeBaseArticle: async (id) => {
    return api.request(`/knowledge-base/${id}`, {
      method: 'DELETE'
    });

  },

  searchKnowledgeBase: async (query) => {
    return api.request(`/knowledge-base/search?query=${query}`);
  },

  // Host Dashboard Extensions
  getMyProperties: async () => {
    return api.request('/properties/my');
  },

  getOnboardingStatus: async () => {
    return api.request('/host-onboarding/status');
  },

  getLiveTours: async () => {
    return api.request('/properties/live-tours');
  },

  // Missing Dashboard Integrations
  getPropertyById: async (id) => { // Assuming backend joins host profile
    return api.request(`/properties/${id}`);
  },

  // Fetches building data and its associated units in a single call
  getPropertyDetails: async (id) => {
    return api.request(`/properties/${id}`);
  },

  getWishlist: async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return [];
    return api.request(`/wishlists/user/${user.id}`);
  },

  // Host specific payouts
  getPayouts: async () => { // Assuming backend filters by current user's host_id
    return api.request('/payouts/my');
  },

  // Admin: Get all payouts across the platform
  getAllPayouts: async () => {
    return api.request('/payouts');
  },

  // Admin: Approve a payout
  adminApprovePayout: async (id) => {
    return api.request(`/payouts/${id}/approve`, { method: 'PATCH' });
  },

  // Invitations
  getInvitations: async () => {
    return api.request('/invitations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
  },

  assignHost: async (hostId, adminId) => {
    return api.request(`/users/hosts/${hostId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ adminId })
    });
  },

  createInvitation: async (inviteData) => {
    return api.request('/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(inviteData)
    });
  },

  // Legacy: Keeping for compatibility
  createHostInvitation: async (inviteData) => { return api.createInvitation({ ...inviteData, role: 'host' }); },

  createPayout: async (payoutData) => {
    return api.request('/payouts', { method: 'POST', body: JSON.stringify(payoutData) });
  },

  // Trigger M-Pesa Payout via Edge Function
  processPayout: async (payoutId) => {
    const { data, error } = await window.supabase.functions.invoke('mpesa-payout', {
      body: { payoutId }
    });
    
    if (error) throw error;
    return data;
  },

  // Admin: Get all refund requests
  getRefunds: async () => { // Assuming backend joins user profile
    return api.request('/refunds');
  },

  // Admin: Process (approve/reject) a refund
  processRefund: async (id, action) => { // Assuming backend handles status update
    return api.request(`/refunds/${id}/${action}`, { method: 'PATCH' });
  },

  // Real AI Chat via Backend Proxy
  sendAIMessage: async (message, context = {}) => {
    try {
      const response = await fetch(`${api.baseUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ message, context: { view: context.view || 'support_dashboard', activeTicketId: context.activeTicketId, userRole: context.userRole || 'support', ...context } })
      });
      return await response.json();
    } catch (error) {
      console.error('AI API Error:', error);
      // Graceful fallback
      return { 
        reply: `AI service temporarily unavailable. Error: ${error.message}. Please check backend server.`,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  },

  // AI Categorization Helper based on subject keywords
  categorizeTicket: async (subject) => {
    const s = subject.toLowerCase();
    let category = 'general';
    
    if (/\b(book|reservation|stay|check|dates|calendar|booking)\b/.test(s)) category = 'Booking';
    else if (/\b(pay|refund|money|price|charge|billing|m-pesa|mpesa|payment)\b/.test(s)) category = 'Payment';
    else if (/\b(error|wifi|app|technical|bug|failed|login|password|tech)\b/.test(s)) category = 'Technical';
    
    return { category };
  },

  // M-Pesa Status Verification (Reconciliation)
  checkMpesaStatus: async (transactionId) => { return api.request(`/payments/mpesa/status/${transactionId}`); }, // End checkMpesaStatus
  getReviews: async () => {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return [];
    // Assuming backend can filter reviews by user_id and join property details
    return api.request(`/reviews/user/${user.id}`);
  }, // End getReviews

  createReview: async (reviewData) => {
    return api.request('/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
  }, // End createReview

  deleteReview: async (reviewId) => {
    return api.request(`/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
  }, // End deleteReview

  // Real-time Subscriptions using Supabase Channels
  registerPropertyRefreshCallback: (cb) => {
    // This assumes Supabase client is initialized and available globally
    if (window.supabase) {
      return window.supabase
        .channel('public:properties')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, payload => cb(payload))
        .subscribe();
    } else {
      console.warn('Supabase client not found for real-time property updates.');
      return null;
    }
  }, // End registerPropertyRefreshCallback
}; // End api object

window.api = api; // Expose globally

// Add the validateInviteToken method to the global API object
window.api.validateInviteToken = async (token) => {
  const { data, error } = await window.supabase.functions.invoke('validate-invite-token', {
    body: { token }
  });
  if (error) throw error;
  return data;
};