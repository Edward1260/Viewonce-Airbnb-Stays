// API Utility Functions for Backend Integration
class API {
    constructor() {
        // Use centralized config for API base URL
        this.baseURL = window.config?.API_BASE_URL || 'http://localhost:3001';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.propertyCaches = new Map(); // Per-filter caching: key = JSON.stringify(filters), value = {data, time}
        this.CACHE_DURATION = 8000; // 8 seconds
        this.propertyRefreshCallbacks = [];
    }

    getBaseURL() {
        return this.baseURL;
    }

    // Helper method to get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return token ? { ...this.defaultHeaders, 'Authorization': `Bearer ${token}` } : this.defaultHeaders;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = this.getAuthHeaders();

        // When sending FormData, the browser sets the Content-Type header automatically,
        // including the boundary. Manually setting it can cause issues.
        // So, we remove the default 'application/json' header for FormData requests.
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const config = {
            headers: this.getAuthHeaders(),
            headers,
            ...options
        };

        try {
            let response;
            try {
                response = await fetch(url, config);
            } catch (netError) {
                if (netError.message === 'Failed to fetch' || netError.message.includes('NetworkError')) {
                    throw netError;
                }
                throw netError;
            }

            if (!response.ok) {
                // Try to get error details from response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        if (Array.isArray(errorData.message)) {
                            errorMessage = errorData.message.join(', ');
                        } else {
                            errorMessage = errorData.message;
                        }
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (parseError) {
                    // If can't parse JSON, use default message
                }

                // If 401, try to refresh token
                if (response.status === 401 && !url.includes('/auth/login')) {
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (refreshToken) {
                        try {
                            const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
                                method: 'POST',
                                headers: this.defaultHeaders,
                                body: JSON.stringify({ refreshToken })
                            });

                            if (refreshResponse.ok) {
                                const refreshData = await refreshResponse.json();
                                // Update tokens
                                localStorage.setItem('token', refreshData.token);
                                localStorage.setItem('refreshToken', refreshData.refreshToken);
                                // Retry the original request with new token
                                const newConfig = {
                                    headers: { ...this.defaultHeaders, 'Authorization': `Bearer ${refreshData.token}` },
                                    ...options
                                };
                                const retryResponse = await fetch(url, newConfig);
                                if (retryResponse.ok) {
                                    if (retryResponse.status === 204) { // No Content
                                        return;
                                    }
                                    return await retryResponse.json();
                                } else {
                                    // If retry also fails, use the error from retry
                                    try {
                                        const retryErrorData = await retryResponse.json();
                                        if (retryErrorData.message) {
                                            if (Array.isArray(retryErrorData.message)) {
                                                errorMessage = retryErrorData.message.join(', ');
                                            } else {
                                                errorMessage = retryErrorData.message;
                                            }
                                        }
                                    } catch (retryParseError) {
                                        // Keep original error message
                                    }
                                }
                            }
                        } catch (refreshError) {
                            console.error('Token refresh failed:', refreshError);
                        }
                    }
                }

                const error = new Error(errorMessage);
                // @ts-ignore
                error.status = response.status;
                throw error;
            }

            if (response.status === 204) { // No Content
                return;
            }

            const data = await response.json();
            // Handle new response format with wrapper
            return data.data !== undefined ? data.data : data;
        } catch (error) {
            const message = this.handleApiError(error);
            throw new Error(message);
        }
    }

    // Authentication APIs
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async signup(userData) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    async refreshToken() {
        return this.request('/auth/refresh', {
            method: 'POST'
        });
    }

    // User APIs
    async getUserProfile() {
        return this.request('/user/profile');
    }

    // Admin User Management APIs
    async createUser(userData) {
        return this.request('/user/admin/create', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getUserById(userId) {
        return this.request(`/user/admin/${userId}`);
    }

    async updateUser(userId, userData) {
        return this.request(`/user/admin/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(userId) {
        return this.request(`/user/admin/${userId}`, {
            method: 'DELETE'
        });
    }

    async toggleUserStatus(userId, isActive) {
        return this.request(`/user/admin/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive })
        });
    }

    async updateUserProfile(profileData) {
        return this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async changePassword(passwordData) {
        return this.request('/user/change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
    }

    // Properties APIs
    async getProperties(filters = {}, bypassCache = false) {
        const cacheKey = JSON.stringify(filters);

        // Return cached properties if available and not bypassed
        if (!bypassCache && this.propertyCaches.has(cacheKey)) {
            const cached = this.propertyCaches.get(cacheKey);
            const now = Date.now();
            if (now - cached.time < this.CACHE_DURATION) {
                return cached.data;
            }
        }

        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = queryParams ? `/properties?${queryParams}` : '/properties';
            const response = await this.request(endpoint);

            // Extract data from response (API returns { data: [...], total, ... })
            const data = response.data || response;

            // Update cache
            this.propertyCaches.set(cacheKey, { data, time: Date.now() });

            // Also update the central store to ensure all components are in sync.
            // This makes the latest properties available to the entire application.
            if (typeof store !== 'undefined' && store.setProperties) {
                store.setProperties(data);
            }

            // Notify all listeners about property refresh
            this.notifyPropertyRefresh(data);

            // Handle new response format with wrapper
            return data.data !== undefined ? data.data : data;
        } catch (error) {
            // No fallback to cached data - always throw error for fresh data
            throw error;
        }
    }

    async refreshProperties() {
        return this.getProperties({}, true); // Bypass cache and force refresh
    }

    registerPropertyRefreshCallback(callback) {
        this.propertyRefreshCallbacks.push(callback);
    }

    notifyPropertyRefresh(properties) {
        this.propertyRefreshCallbacks.forEach(callback => {
            try {
                callback(properties);
            } catch (error) {
                // Silently handle callback errors
            }
        });
    }

    async getPropertyById(propertyId) {
        return this.request(`/properties/${propertyId}`);
    }

    async getMyProperties() {
        return this.request('/properties/host/my-properties');
    }

    async getAllProperties(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/properties/admin/all?${queryParams}` : '/properties/admin/all';
        return this.request(endpoint);
    }

    async getHosts() {
        return this.request('/user/hosts');
    }

    async sendHostInvitation(email) {
        return this.request('/properties/host-invitations', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async getUsers(role = null) {
        if (role === 'host') {
            return this.getHosts();
        } else if (role === 'customer') {
            // For customers, get all users and filter on frontend
            const allUsers = await this.request('/user/admin/all');
            const customers = allUsers.filter(user => user.role === 'customer');
            return customers;
        } else {
            // Get all users for admin
            return this.request('/user/admin/all');
        }
    }

    async createProperty(propertyData) {
        const result = await this.request('/properties', {
            method: 'POST',
            body: JSON.stringify(propertyData)
        });

        // Clear all property caches to force refresh on next fetch
        this.propertyCaches.clear();

        // Notify any active listeners (polling)
        this.notifyPropertyRefresh();

        return result;
    }

    async updateProperty(propertyId, propertyData) {
        const result = await this.request(`/properties/${propertyId}`, {
            method: 'PUT',
            body: JSON.stringify(propertyData)
        });

        // Clear all property caches to force refresh on next fetch
        this.propertyCaches.clear();

        // Notify any active listeners (polling)
        this.notifyPropertyRefresh();

        return result;
    }

    async deleteProperty(propertyId) {
        const result = await this.request(`/properties/${propertyId}`, {
            method: 'DELETE'
        });

        // Clear all property caches to force refresh on next fetch
        this.propertyCaches.clear();

        // Notify any active listeners (polling)
        this.notifyPropertyRefresh();

        return result;
    }

    // Booking APIs
    async getBookings(status = null) {
        const endpoint = status ? `/bookings?status=${status}` : '/bookings';
        return this.request(endpoint);
    }

    async getBookingById(bookingId) {
        return this.request(`/bookings/${bookingId}`);
    }

    async createBooking(bookingData) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    async updateBooking(bookingId, bookingData) {
        return this.request(`/bookings/${bookingId}`, {
            method: 'PUT',
            body: JSON.stringify(bookingData)
        });
    }

    async cancelBooking(bookingId) {
        return this.request(`/bookings/${bookingId}/cancel`, {
            method: 'POST'
        });
    }

    // Wishlist APIs
    async getWishlist() {
        return this.request('/wishlist');
    }

    async addToWishlist(propertyId) {
        return this.request('/wishlist', {
            method: 'POST',
            body: JSON.stringify({ propertyId })
        });
    }

    async removeFromWishlist(propertyId) {
        return this.request(`/wishlist/${propertyId}`, {
            method: 'DELETE'
        });
    }

    // Reviews APIs
    async getPropertyReviews(propertyId) {
        return this.request(`/properties/${propertyId}/reviews`);
    }

    async createReview(propertyId, reviewData) {
        return this.request(`/properties/${propertyId}/reviews`, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    }

    async updateReview(reviewId, reviewData) {
        return this.request(`/reviews/${reviewId}`, {
            method: 'PUT',
            body: JSON.stringify(reviewData)
        });
    }

    async deleteReview(reviewId) {
        return this.request(`/reviews/${reviewId}`, {
            method: 'DELETE'
        });
    }

    // Payment APIs
    async createPaymentIntent(bookingData) {
        return this.request('/payments/create-intent', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    async processPayment(paymentData) {
        return this.request('/payments/process', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async getPaymentHistory(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/payments/history?${queryParams}` : '/payments/history';
        return this.request(endpoint);
    }

    // Payment Methods Management
    async getPaymentMethods() {
        return this.request('/payments/methods');
    }

    async addPaymentMethod(paymentMethodData) {
        return this.request('/payments/methods', {
            method: 'POST',
            body: JSON.stringify(paymentMethodData)
        });
    }

    async deletePaymentMethod(methodId) {
        return this.request(`/payments/methods/${methodId}`, {
            method: 'DELETE'
        });
    }

    async setDefaultPaymentMethod(methodId) {
        return this.request(`/payments/methods/${methodId}/default`, {
            method: 'PUT'
        });
    }

    // Card Payments (Stripe)
    async createCardPayment(paymentData) {
        return this.request('/payments/card', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async verifyCardPayment(paymentId) {
        return this.request(`/payments/card/${paymentId}/verify`, {
            method: 'POST'
        });
    }

    // PayPal Payments
    async createPayPalPayment(paymentData) {
        return this.request('/payments/paypal', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async capturePayPalPayment(paymentId) {
        return this.request(`/payments/paypal/${paymentId}/capture`, {
            method: 'POST'
        });
    }

    // Bank Transfer Payments
    async createBankTransferPayment(paymentData) {
        return this.request('/payments/bank-transfer', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async verifyBankTransfer(transferId, reference) {
        return this.request(`/payments/bank-transfer/${transferId}/verify`, {
            method: 'POST',
            body: JSON.stringify({ reference })
        });
    }

    async getBankTransferInstructions(bookingId) {
        return this.request(`/payments/bank-transfer/${bookingId}/instructions`);
    }

    // M-Pesa Payments
    async initiateMpesaPayment(paymentData) {
        return this.request('/payments/mpesa', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async checkMpesaPaymentStatus(transactionId) {
        return this.request(`/payments/mpesa/${transactionId}/status`);
    }

    async verifyMpesaPayment(paymentId) {
        return this.request(`/payments/mpesa/${paymentId}/verify`, {
            method: 'POST'
        });
    }

    // Refund APIs
    async createRefund(refundData) {
        return this.request('/payments/refund', {
            method: 'POST',
            body: JSON.stringify(refundData)
        });
    }

    async getRefundStatus(refundId) {
        return this.request(`/payments/refund/${refundId}`);
    }

    async getRefunds(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/payments/refunds?${queryParams}` : '/payments/refunds';
        return this.request(endpoint);
    }

    async cancelRefund(refundId) {
        return this.request(`/payments/refund/${refundId}/cancel`, {
            method: 'POST'
        });
    }

    // Payment Receipts
    async getPaymentReceipt(paymentId) {
        return this.request(`/payments/${paymentId}/receipt`);
    }

    async generateReceipt(paymentId) {
        return this.request(`/payments/${paymentId}/receipt/generate`, {
            method: 'POST'
        });
    }

    async downloadReceipt(paymentId, format = 'pdf') {
        return this.request(`/payments/${paymentId}/receipt/download?format=${format}`, {
            method: 'GET'
        });
    }

    async emailReceipt(paymentId, email) {
        return this.request(`/payments/${paymentId}/receipt/email`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    // Payment Verification
    async verifyPayment(paymentId) {
        return this.request(`/payments/${paymentId}/verify`, {
            method: 'POST'
        });
    }

    async getPaymentStatus(paymentId) {
        return this.request(`/payments/${paymentId}/status`);
    }

    // Escrow Management
    async holdEscrow(bookingId) {
        return this.request(`/payments/escrow/${bookingId}/hold`, {
            method: 'POST'
        });
    }

    async releaseEscrow(bookingId) {
        return this.request(`/payments/escrow/${bookingId}/release`, {
            method: 'POST'
        });
    }

    async getEscrowStatus(bookingId) {
        return this.request(`/payments/escrow/${bookingId}/status`);
    }

    // Admin Refund Management APIs
    async getAllRefunds(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/admin/refunds?${queryParams}` : '/admin/refunds';
        return this.request(endpoint);
    }

    async getRefundById(refundId) {
        return this.request(`/admin/refunds/${refundId}`);
    }

    async approveRefund(refundId, data = {}) {
        return this.request(`/admin/refunds/${refundId}/approve`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async rejectRefund(refundId, reason) {
        return this.request(`/admin/refunds/${refundId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    async processRefund(refundId) {
        return this.request(`/admin/refunds/${refundId}/process`, {
            method: 'POST'
        });
    }

    async getRefundStats() {
        return this.request('/admin/refunds/stats');
    }

    // Admin Payout Management APIs
    async getAllPayouts(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/admin/payouts?${queryParams}` : '/admin/payouts';
        return this.request(endpoint);
    }

    async getPayoutById(payoutId) {
        return this.request(`/admin/payouts/${payoutId}`);
    }

    async adminApprovePayout(payoutId, data = {}) {
        return this.request(`/admin/payouts/${payoutId}/approve`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async adminRejectPayout(payoutId, reason) {
        return this.request(`/admin/payouts/${payoutId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    async adminProcessPayout(payoutId) {
        return this.request(`/admin/payouts/${payoutId}/process`, {
            method: 'POST'
        });
    }

    async adminCompletePayout(payoutId, data = {}) {
        return this.request(`/admin/payouts/${payoutId}/complete`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getPayoutStats() {
        return this.request('/admin/payouts/stats');
    }

    // Admin Payment Management APIs
    async getAllPayments(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/admin/payments?${queryParams}` : '/admin/payments';
        return this.request(endpoint);
    }

    async getPaymentById(paymentId) {
        return this.request(`/admin/payments/${paymentId}`);
    }

    async adminVerifyPayment(paymentId) {
        return this.request(`/admin/payments/${paymentId}/verify`, {
            method: 'POST'
        });
    }

    async adminCancelPayment(paymentId, reason) {
        return this.request(`/admin/payments/${paymentId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    async getPaymentStats() {
        return this.request('/admin/payments/stats');
    }

    // Notification APIs
    async getNotifications() {
        return this.request('/notifications');
    }

    async markNotificationAsRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'POST'
        });
    }

    async deleteNotification(notificationId) {
        return this.request(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
    }

    // File Upload APIs
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Use the generic request method which handles FormData correctly
        // and benefits from centralized error handling and token refresh.
        return this.request('/upload/image', {
            method: 'POST',
            headers,
            body: formData
        });
    }

    async uploadVideo(file) {
        const formData = new FormData();
        formData.append('video', file);

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Use the generic request method which handles FormData correctly
        // and benefits from centralized error handling and token refresh.
        return this.request('/upload/video', {
            method: 'POST',
            headers,
            body: formData
        });
    }

    // Live Tours APIs
    async getLiveTours() {
        return this.request('/live-tours');
    }

    async createLiveTour(tourData) {
        return this.request('/live-tours', {
            method: 'POST',
            body: JSON.stringify(tourData)
        });
    }

    async updateLiveTour(tourId, tourData) {
        return this.request(`/live-tours/${tourId}`, {
            method: 'PATCH',
            body: JSON.stringify(tourData)
        });
    }

    async deleteLiveTour(tourId) {
        return this.request(`/live-tours/${tourId}`, {
            method: 'DELETE'
        });
    }

    // Analytics APIs
    async getDashboardStats() {
        return this.request('/analytics/dashboard');
    }

    async getRevenueChart(days = 30) {
        return this.request(`/analytics/revenue-chart?days=${days}`);
    }

    async getBookingTrends(days = 30) {
        return this.request(`/analytics/booking-trends?days=${days}`);
    }

    async getTopProperties(limit = 10) {
        return this.request(`/analytics/top-properties?limit=${limit}`);
    }

    async getTopHosts(limit = 10) {
        return this.request(`/analytics/top-hosts?limit=${limit}`);
    }

    // Payout APIs
    async getPayouts(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/payouts?${queryParams}` : '/payouts';
        return this.request(endpoint);
    }

    async createPayout(bookingId) {
        return this.request(`/payouts/${bookingId}/create`, {
            method: 'POST'
        });
    }

    async approvePayout(payoutId) {
        return this.request(`/payouts/${payoutId}/approve`, {
            method: 'PUT'
        });
    }

    async completePayout(payoutId) {
        return this.request(`/payouts/${payoutId}/complete`, {
            method: 'PUT'
        });
    }

    async cancelPayout(payoutId, reason = '') {
        return this.request(`/payouts/${payoutId}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
    }

    async disputePayout(payoutId, reason) {
        return this.request(`/payouts/${payoutId}/dispute`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
    }

    // Terms Acceptance API
    async acceptTerms(type = 'general') {
        return this.request('/terms-acceptance', {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    }

    // Analytics APIs (for admin)
    async getAnalytics() {
        return this.request('/analytics/dashboard');
    }

    async generateReport(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/analytics/report?${queryParams}` : '/analytics/report';
        return this.request(endpoint);
    }

    // Admin Settings API
    async saveAdminSettings(settings) {
        return this.request('/admin/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    }

    async getAdminSettings() {
        return this.request('/admin/settings');
    }

    // AI APIs
    async sendAIMessage(message, sessionId = null) {
        const payload = { message };
        if (sessionId) payload.sessionId = sessionId;
        return this.request('/ai/chat', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getAIChatHistory(sessionId) {
        return this.request(`/ai/chat/history/${sessionId}`);
    }

    async getAISessions() {
        return this.request('/ai/chat/sessions');
    }

    async getAIAnalyticsInsights() {
        return this.request('/ai/analytics/insights');
    }

    async getAIAutomationRules() {
        return this.request('/ai/automation/rules');
    }

    async updateAIAutomationRule(ruleId, updates) {
        return this.request(`/ai/automation/rules/${ruleId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteAIAutomationRule(ruleId) {
        return this.request(`/ai/automation/rules/${ruleId}`, {
            method: 'DELETE'
        });
    }

    async getAISavedReports() {
        return this.request('/ai/reports/saved');
    }

    async saveAIReport(name, type, data) {
        return this.request('/ai/reports/save', {
            method: 'POST',
            body: JSON.stringify({ name, type, data })
        });
    }

    async executeAIAutomationRules(data) {
        return this.request('/ai/automation/execute', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Settings API (local storage for now)
    async saveSettings(settings) {
        // For now, save to localStorage since there's no backend endpoint
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        return { success: true, message: 'Settings saved successfully' };
    }

    async getSettings() {
        const settings = localStorage.getItem('adminSettings');
        return settings ? JSON.parse(settings) : {};
    }

    // Utility methods for error handling
    handleApiError(error) {
        // Handle different error types
        // @ts-ignore
        const status = error.status;

        // Network errors (often don't have a status or are TypeError)
        if (!status && (error instanceof TypeError || error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
            return 'Network error. Please check your connection or try again later.';
        }

        if (status === 400) {
            return error.message || 'Invalid request. Please check your input.';
        }

        if (status === 401) {
            // Unauthorized - redirect to login, but not if we are already logging in
            if (error.message?.includes('/auth/login')) return 'Invalid credentials';
            // Don't redirect on dashboard pages to prevent dashboard disappearing
            if (window.location.pathname.includes('dashboard')) {
                return 'Session expired. Please refresh the page and login again.';
            }
            if (typeof store !== 'undefined' && store.logout) {
                store.logout();
            }
            window.location.href = 'login-signup.html';
            return 'Session expired. Please login again.';
        }

        if (status === 403) {
            return 'You do not have permission to perform this action.';
        }

        if (status === 404) {
            return 'The requested resource was not found.';
        }

        if (status === 409) {
            return error.message || 'Conflict: The resource already exists.';
        }

        if (status === 422) {
            return error.message || 'Validation error. Please check your data.';
        }

        if (status === 429) {
            return 'Too many requests. Please slow down and try again later.';
        }

        if (status >= 500) {
            if (status === 503) {
                return 'Service unavailable. Please try again later.';
            }
            // Log the actual error for debugging
            console.error('Server error details:', error.message);
            return `Server error (${status}): Please try again later.`;
        }

        // For other errors, return the error message directly
        return error.message || 'An unexpected error occurred. Please try again.';
    }
}

// Create global API instance
const api = new API();

// Make available globally immediately
if (typeof window !== 'undefined') {
    window.api = api;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
