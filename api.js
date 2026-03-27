 // c:\Users\Administrator\Downloads\Viewonce Airbnb Stays\api.js
// This file provides a centralized API client for the frontend.

/* Supabase Migration - Phase 2 MVP */
let supabase = window.supabase;

// API Configuration - Supabase + Backend hybrid during migration
const API_CONFIG = {
  baseUrl: 'http://localhost:3001/api/v1', // Backend fallback
  socketUrl: 'http://localhost:3001',
  timeout: 30000,
  retries: 0
};

function checkSupabase() {
  if (!supabase) {
    console.warn('Supabase not loaded. Using backend fallback. Load lib/supabase.js first.');
    return false;
  }
  return true;
}

let socket = null;
const propertyRefreshCallbacks = [];
const typingCallbacks = [];

/**
 * Generic API call function.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/login').
 * @param {object} options - Fetch options (method, body, headers).
 * @returns {Promise<any>} - The JSON response from the API.
 */
async function apiCall(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      // Add a signal for aborting fetch requests if they take too long
      signal: AbortSignal.timeout(API_CONFIG.timeout)
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON, use status text
        errorData = { message: response.statusText };
      }
      throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
    }

    // Handle cases where response might be empty (e.g., DELETE requests)
    const text = await response.text();
    return text ? JSON.parse(text) : {};

  } catch (error) {
    console.error(`API call to ${url} failed:`, error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

// Expose API functions globally via window.api
window.api = {
  // Real-time WebSocket Initialization
  initRealtime: async () => {
    if (typeof io === 'undefined') {
      console.warn('Socket.io client not loaded. Real-time features disabled.');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    socket = io(API_CONFIG.socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => console.log('Connected to Realtime Gateway'));
    
    // Listen for property updates from backend
    socket.on('propertyUpdate', (data) => {
      console.log('Real-time property update received:', data);
      propertyRefreshCallbacks.forEach(cb => cb(data));
    });

    socket.on('newMessage', (message) => {
      console.log('New chat message received:', message);
      window.dispatchEvent(new CustomEvent('chat:newMessage', { detail: message }));
    });

    socket.on('bookingUpdate', (data) => {
      console.log('Real-time booking update:', data);
      // Trigger global notification or specific UI update if needed
    });

    socket.on('support:userTyping', (data) => {
      typingCallbacks.forEach(cb => cb(data));
    });
  },

  registerPropertyRefreshCallback: (cb) => propertyRefreshCallbacks.push(cb),

  // Real-time Support Chat Methods
  joinTicketRoom: (ticketId) => {
    if (socket) socket.emit('support:joinTicket', { ticketId });
  },
  sendTypingStatus: (ticketId, isTyping) => {
    if (socket) socket.emit('support:typing', { ticketId, isTyping });
  },
  onTypingStatus: (cb) => typingCallbacks.push(cb),

  // Authentication - NestJS Auth
  login: (credentials) => apiCall('/auth/login', { method: 'POST', body: credentials }),
  signup: (userData) => apiCall('/auth/signup', { method: 'POST', body: userData }),
  logout: () => apiCall('/auth/logout', { method: 'POST' }),
  getProfile: () => apiCall('/auth/profile'),

  // Users
  getUsers: (role) => apiCall(`/users${role ? `?role=${role}` : ''}`),
  getHosts: async () => window.api.getUsers('host'),

  // Properties
  getProperties: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall(`/properties${params ? `?${params}` : ''}`);
  },
  getAllProperties: () => apiCall('/properties'),
  createProperty: (data) => apiCall('/properties', { method: 'POST', body: data }),
  updateProperty: (id, data) => apiCall(`/properties/${id}`, { method: 'PATCH', body: data }),
  deleteProperty: (id) => apiCall(`/properties/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: () => apiCall('/bookings'),
  getBookingById: (id) => apiCall(`/bookings/${id}`),
  createBooking: (bookingData) => apiCall('/bookings', { method: 'POST', body: bookingData }),
  cancelBooking: (id) => apiCall(`/bookings/${id}/cancel`, { method: 'POST' }),

  // Payments & Refunds (assuming these exist in backend based on admin-payments.html)
  getRefundStats: () => apiCall('/payments/admin/refund-stats'), // Placeholder - adjust endpoint if different
  getAllRefunds: () => apiCall('/payments/admin/refunds'), // Placeholder - adjust endpoint if different
  approveRefund: (id) => apiCall(`/payments/admin/refunds/${id}/approve`, { method: 'POST' }), // Placeholder - adjust endpoint if different
  rejectRefund: (id, reason) => apiCall(`/payments/admin/refunds/${id}/reject`, { method: 'POST', body: { reason } }), // Placeholder - adjust endpoint if different
  processRefund: (id) => apiCall(`/payments/admin/refunds/${id}/process`, { method: 'POST' }), // Placeholder - adjust endpoint if different

  // Payouts (assuming these exist in backend based on admin-payments.html)
  getPayoutStats: () => apiCall('/payments/admin/payout-stats'), // Placeholder - adjust endpoint if different
  getAllPayouts: () => apiCall('/payments/admin/payouts'), // Placeholder - adjust endpoint if different
  approvePayout: (id) => apiCall(`/payments/admin/payouts/${id}/approve`, { method: 'POST' }), // Placeholder - adjust endpoint if different
  rejectPayout: (id, reason) => apiCall(`/payments/admin/payouts/${id}/reject`, { method: 'POST', body: { reason } }), // Placeholder - adjust endpoint if different
  processPayout: (id) => apiCall(`/payments/admin/payouts/${id}/process`, { method: 'POST' }), // Placeholder - adjust endpoint if different
  completePayout: (id) => apiCall(`/payments/admin/payouts/${id}/complete`, { method: 'POST' }), // Placeholder - adjust endpoint if different
  reschedulePayout: (id) => apiCall(`/admin/payments/payouts/${id}/reschedule`, { method: 'POST' }),
  getAllPayments: () => apiCall('/payments/admin/all'), // Placeholder for all transactions

  // AI Chat - This is the core of the request
  sendAIMessage: (message, dashboardState = {}) => {
    const body = {
      message,
      context: {
        ...dashboardState,
        timestamp: new Date().toISOString()
      }
    };
    return apiCall('/ai/chat', { method: 'POST', body });
  },
  getAIChatHistory: (userId) => apiCall(`/ai/chat/history?userId=${userId}`), // Placeholder - adjust endpoint if different
  getAIInsights: (filters) => apiCall(`/ai/analytics/insights?${new URLSearchParams(filters).toString()}`),

  // Media & AI Processing (New for Modern Property Builder)
  uploadMedia: async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const response = await fetch(`${API_CONFIG.baseUrl}/upload/bulk`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return response.json();
  },
  processMediaAI: (fileIds) => apiCall('/ai/process-property-images', { method: 'POST', body: { fileIds } }),
  deleteMedia: (fileId) => apiCall(`/upload/${fileId}`, { method: 'DELETE' }),
  updateMediaOrder: (propertyId, mediaOrder) => apiCall(`/properties/${propertyId}/media-order`, { method: 'PATCH', body: { mediaOrder } }),

  // Host-specific methods (CRITICAL for host-dashboard-upgraded.html)
  getMyProperties: () => apiCall('/properties/my'),
  getOnboardingStatus: () => apiCall('/host/onboarding/status'),

  // Host Invitations (based on backend/src/properties/host-invitation.controller.ts)
  createHostInvitation: (invitationData) => apiCall('/properties/host-invitations', { method: 'POST', body: invitationData }),
  validateHostInvitation: (token) => apiCall(`/properties/host-invitations/validate/${token}`),
  getHostInvitations: () => apiCall('/properties/host-invitations'),
  cancelHostInvitation: (id) => apiCall(`/properties/host-invitations/${id}`, { method: 'DELETE' }),
  getHostInvitationStats: () => apiCall('/properties/host-invitations/stats'),

  // Support Stats (placeholder, assuming a dedicated endpoint for support dashboard KPIs)
  getSupportStats: () => apiCall('/support/stats'),
  getSupportTickets: (filters = {}) => apiCall(`/support/tickets?${new URLSearchParams(filters).toString()}`),
  getSupportTicket: (id) => apiCall(`/support/tickets/${id}`),
  getTickets: (filters = {}) => apiCall(`/support/tickets?${new URLSearchParams(filters).toString()}`),
  updateTicket: (id, data) => apiCall(`/support/tickets/${id}`, { method: 'PUT', body: data }),
  
  // Support: Update Host Phone (for B2C security)
  updateHostPhone: (hostId, phone) => 
    apiCall(`/support/hosts/${hostId}/phone`, { method: 'PUT', body: { phone } }),

  addSupportComment: (id, data) => apiCall(`/support/tickets/${id}/comments`, { method: 'POST', body: data }),
};