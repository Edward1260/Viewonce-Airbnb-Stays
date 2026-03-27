// c:\Users\Administrator\Downloads\Viewonce Airbnb Stays\api.js
// This file provides a centralized API client for the frontend.

// API Configuration - based on SETUP_DEPLOYMENT.md and APP_UPGRADE_IMPLEMENTATION.md
const API_CONFIG = {
  baseUrl: 'http://localhost:3001/api/v1', // Backend URL from SETUP_DEPLOYMENT.md
  timeout: 30000, // 30 seconds
  retries: 0 // Simple implementation, no retries for now
};

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
  // Authentication
  login: (credentials) => apiCall('/auth/login', { method: 'POST', body: credentials }),
  signup: (userData) => apiCall('/auth/signup', { method: 'POST', body: userData }),
  logout: () => apiCall('/auth/logout', { method: 'POST' }),
  getProfile: () => apiCall('/auth/profile'),

  // Users
  getUsers: (role) => apiCall(`/users${role ? `?role=${role}` : ''}`),
  getHosts: () => apiCall('/users?role=host'), // Specific for admin-dashboard.html

  // Properties
  getProperties: (filters) => apiCall(`/properties?${new URLSearchParams(filters).toString()}`),
  getAllProperties: () => apiCall('/properties/admin/all'), // Specific for admin-dashboard.html
  createProperty: (propertyData) => apiCall('/properties', { method: 'POST', body: propertyData }),
  updateProperty: (id, propertyData) => apiCall(`/properties/${id}`, { method: 'PUT', body: propertyData }),
  deleteProperty: (id) => apiCall(`/properties/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: () => apiCall('/bookings'),
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
  getAllPayments: () => apiCall('/payments/admin/all'), // Placeholder for all transactions

  // AI Chat - This is the core of the request
  sendAIMessage: (data) => apiCall('/ai/chat', { method: 'POST', body: data }),
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
  getSupportStats: () => apiCall('/support/stats'), // Placeholder - adjust endpoint if different
};