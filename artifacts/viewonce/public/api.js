// Centralized Supabase API client for the ViewOnce Airbnb Stays App

const isBrowser = typeof window !== 'undefined';

// Expose API functions globally via window.api
const api = {
  // Internal state for caching and real-time updates
  _propertyCache: null,
  _propertyCacheTime: null,
  _CACHE_DURATION: 30000, // 30 seconds
  _propertyRefreshCallbacks: [],
  baseUrl: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || (isBrowser && window.config?.API_BASE_URL) || '/api',

  /**
   * Internal helper to get auth headers safely
   */
  _getAuthHeaders(tokenOverride = null) {
    const token = tokenOverride || (isBrowser ? localStorage.getItem('token') : null);
    return token ? { 
        'Authorization': `Bearer ${token}`,
        'X-Client-Version': window.config?.VERSION || '1.0.0'
    } : {};
  },

  /**
   * Centralized Request Wrapper with Timeout and Error Handling
   */
  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), window.config?.TIMEOUT || 15000);
    
    options.signal = controller.signal;
    options.headers = {
        ...options.headers,
        ...this._getAuthHeaders()
    };

    try {
      const response = await fetch(`${api.baseUrl}${endpoint}`, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.error || errorData.message || `API Error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (isBrowser) console.error(`Request failed for ${endpoint}:`, error);
      if (error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      if (isBrowser && window.showToast) window.showToast(error.message, 'error');
      throw error;
    }
  },

  clearAuth: () => {
    if (!isBrowser) return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('airbnb_app_state');
  },

  redirectToAuth: () => {
    if (!isBrowser) return;
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('auth.html');
    } else {
      window.location.href = 'auth.html';
    }
  },

  requireCustomerSession: async () => {
    if (!isBrowser) return null;

    const token = localStorage.getItem('token');
    if (!token) {
      api.redirectToAuth();
      return null;
    }

    try {
      const user = await api.getProfile(token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isLoggedIn', 'true');

      if (user?.role !== 'customer') {
        const dashboards = {
          host: 'host-dashboard-upgraded.html',
          admin: 'admin-dashboard.html',
          support: 'support-dashboard-upgraded.html',
          platform_master_hub: 'platform-master-hub/dashboard.html',
          platform_master: 'platform-master-hub/dashboard.html',
          super_admin: 'platform-master-hub/dashboard.html'
        };
        const destination = dashboards[user?.role];
        if (destination && typeof window.navigateTo === 'function') {
          window.navigateTo(destination);
        } else {
          api.redirectToAuth();
        }
        return null;
      }

      return user;
    } catch (error) {
      api.clearAuth();
      api.redirectToAuth();
      return null;
    }
  },

  // Authentication via Express API (no Supabase required)
  login: async (credentials) => {
    if (!isBrowser) throw new Error('Auth requires browser environment');
    const data = await api.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return data;
  }, // End login

  // Standard Signup — delegates to /auth/signup
  signup: async (userData) => {
    if (!isBrowser) throw new Error('Auth requires browser environment');
    const data = await api.request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return data;
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
    if (!isBrowser) return;

    // Tell the API server to invalidate (no-op for stateless JWTs)
    try {
      await api.request('/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch { /* ignore — clear client state regardless */ }

    // Clear all local auth state
    api.clearAuth();

    // Redirect to auth page
    api.redirectToAuth();
  }, // End logout

  // Verify platform master role via secure endpoint
  verifyMasterRole: async (token = null) => {
    return api.request('/auth/verify-master', {
      headers: { ...api._getAuthHeaders(token) }
    });
  },

  getProfile: async (token = null) => {
    if (!isBrowser && !token) return null;
    return api.request('/users/me', { headers: api._getAuthHeaders(token) });
  },

  // Users
  getUsers: async (role, token = null) => {
    let endpoint = '/users';
    if (role) endpoint += `?role=${role}`;
    return api.request(endpoint, {
      headers: { ...api._getAuthHeaders(token) }
    });
  },

  // Admin: Create or update a user manually
  createUser: async (userData, token = null) => {
    return api.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...api._getAuthHeaders(token) },
      body: JSON.stringify(userData)
    });
  },

  // Properties
  getProperties: async (filters = {}, forceRefresh = false) => {
    // Implement Modern Caching Strategy
    if (!forceRefresh && api._propertyCache && (Date.now() - api._propertyCacheTime < api._CACHE_DURATION)) {
        console.log('📦 Returning properties from cache');
        return api._propertyCache;
    }

    let endpoint = '/properties';
    const params = new URLSearchParams(filters);
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    const data = await api.request(endpoint);
    
    // Update cache
    api._propertyCache = data;
    api._propertyCacheTime = Date.now();
    
    return data;
  },

  getAllProperties: async () => {
    return api.request('/properties');
  },

  createProperty: async (propData, token = null) => {
    const result = await api.request('/properties', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...api._getAuthHeaders(token)
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
  getBookings: async (token = null) => {
    return api.request('/bookings', {
        headers: api._getAuthHeaders(token)
    });
  },

  // Admin: Get all payments/transactions across the platform
  getAllPayments: async (token = null) => {
    return api.request('/payments', { headers: api._getAuthHeaders(token) });
  },

  createBooking: async (bookingData, token = null) => {
    // Financial calculations and payment record creation moved to backend for security
    const booking = await api.request('/bookings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...api._getAuthHeaders(token)
      },
      body: JSON.stringify(bookingData)
    });
    return booking;
  },

  // Support API
  getSupportStats: async () => {
    const stats = await api.request('/support/tickets/stats');
    return {
      activeCount: Number(stats.activeCount || 0),
      resolvedCount: Number(stats.resolvedCount || 0),
      totalCount: Number(stats.totalCount || 0)
    };
  },

  getSupportTickets: async (filters = {}, token = null) => {
    let endpoint = '/support/tickets';
    const params = new URLSearchParams(filters);
    if (params.toString()) endpoint += `?${params.toString()}`;
    const data = await api.request(endpoint, { headers: api._getAuthHeaders(token) });
    return data.map(t => ({ ...t, customer: t.customer?.full_name || 'Guest' })); // Assuming backend joins customer data
  },

  createSupportTicket: async (ticketData, token = null) => {
    const user = await api.getProfile(token);
    if (!user) throw new Error('User not authenticated');

    
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

  updateSupportTicket: async (id, updates, token = null) => {
    return api.request(`/support/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...api._getAuthHeaders(token) },
      body: JSON.stringify(updates)
    });
  },

  addSupportComment: async (ticketId, { content, isInternal = false }, token = null) => {
    const user = await api.getProfile(token);
    return api.request('/support/comments', {
      method: 'POST',
      headers: api._getAuthHeaders(token),
      body: JSON.stringify({ ticket_id: ticketId, author_id: user.id, content, is_internal: isInternal })
    });
  },

  // System Monitoring & Security
  getSecurityStats: async (token = null) => {
    return api.request('/security/stats', { headers: api._getAuthHeaders(token) });
  },

  getActiveThreats: async (token = null) => {
    return api.request('/security/threats/active', { headers: api._getAuthHeaders(token) });
  },

  getSecurityEvents: async (token = null) => {
    return api.request('/security/events', { headers: api._getAuthHeaders(token) });
  },

  getErrors: async (token = null) => {
    return api.request('/system/errors', { headers: api._getAuthHeaders(token) });
  },

  getPerformanceMetrics: async (token = null) => {
    return api.request('/system/performance', { headers: api._getAuthHeaders(token) });
  },

  getAuditLogs: async (token = null) => {
    return api.request('/system/audit-logs', { headers: api._getAuthHeaders(token) });
  },

  getAIAnalyticsInsights: async (token = null) => {
    return api.request('/ai/analytics/insights', { headers: api._getAuthHeaders(token) });
  },

  getRefundStats: async (token = null) => {
    return api.request('/refunds/stats', { headers: api._getAuthHeaders(token) });
  },

  getPayoutStats: async (token = null) => {
    return api.request('/payouts/stats', { headers: api._getAuthHeaders(token) });
  },

  getKnowledgeBaseArticles: async () => {
    try {
      return await api.request('/knowledge-base');
    } catch {
      return [];
    }
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

  getWishlist: async (token = null) => {
    const user = await api.getProfile(token);
    if (!user) return [];
    return api.request(`/wishlists/user/${user.id}`, { headers: api._getAuthHeaders(token) });
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
  getInvitations: async (token = null) => {
    return api.request('/invitations', {
      headers: { ...api._getAuthHeaders(token) }
    });
  },

  assignHost: async (hostId, adminId, token = null) => {
    return api.request(`/users/hosts/${hostId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...api._getAuthHeaders(token) },
      body: JSON.stringify({ adminId })
    });
  },

  createInvitation: async (inviteData, token = null) => {
    return api.request('/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...api._getAuthHeaders(token) },
      body: JSON.stringify(inviteData)
    });
  },

  // Legacy: Keeping for compatibility
  createHostInvitation: async (inviteData) => { return api.createInvitation({ ...inviteData, role: 'host' }); },

  createPayout: async (payoutData) => {
    return api.request('/payouts', { method: 'POST', body: JSON.stringify(payoutData) });
  },

  // Trigger Payout via API
  processPayout: async (payoutId, token = null) => {
    return api.request(`/payouts/${payoutId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...api._getAuthHeaders(token) },
      body: JSON.stringify({ payoutId })
    });
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
  sendAIMessage: async (message, context = {}, token = null) => {
    try {
      const response = await fetch(`${api.baseUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api._getAuthHeaders(token) },
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
  getReviews: async (token = null) => {
    const user = await api.getProfile(token);
    if (!user) return [];

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

  // Real-time property refresh via polling (Supabase not required)
  registerPropertyRefreshCallback: (cb) => {
    if (!isBrowser || typeof cb !== 'function') return null;
    // Poll every 30 seconds as a lightweight alternative to Supabase channels
    const interval = setInterval(async () => {
      try {
        const props = await api.getProperties({}, true);
        cb({ new: props });
      } catch { /* ignore */ }
    }, 30000);
    return { unsubscribe: () => clearInterval(interval) };
  },

  validateInviteToken: async (token) => {
    const data = await api.request('/validate-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action: 'check' })
    });
    if (!data.valid) throw new Error('Invalid or expired invite token');
    return data;
  },
}; // End api object

if (isBrowser) {
    window.api = api; // Expose globally for legacy scripts
}
if (typeof module !== 'undefined') module.exports = api;