// Centralized State Management for Airbnb App
class Store {
    constructor() {
        this.state = {
            user: {
                isLoggedIn: false,
                profile: null,
                sessionToken: null,
                refreshToken: null
            },
            bookings: [],
            wishlist: [],
            reviews: [],
            search: {
                location: '',
                checkin: '',
                checkout: '',
                filters: {
                    price: '',
                    rating: '',
                    propertyType: '',
                    amenities: ''
                },
                sortBy: 'recommended',
                currentPage: 1,
                itemsPerPage: 6
            },
            properties: [], // Removed mock data - will load from backend API
            notifications: [],
            hostApplications: [],
            users: [],
            emails: [],
            reports: []
        };

        this.listeners = [];
        this.loadFromStorage();

        // Listen for localStorage changes in other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'airbnb_app_state' && event.newValue) {

                const newState = JSON.parse(event.newValue);
                this.state = this.mergeState(this.state, newState);
                this.notify();
            }
        });
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notify all listeners of state changes
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Update state and persist to localStorage
    setState(updates) {
        this.state = this.mergeState(this.state, updates);
        this.saveToStorage();
        this.notify();
    }

    // Deep merge state updates
    mergeState(oldState, updates) {
        const newState = { ...oldState };

        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
                newState[key] = this.mergeState(oldState[key] || {}, updates[key]);
            } else {
                newState[key] = updates[key];
            }
        });

        return newState;
    }

    // Load state from localStorage
    loadFromStorage() {
        try {
            const savedState = localStorage.getItem('airbnb_app_state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                this.state = this.mergeState(this.state, parsed);
            }
            // Load token and user from localStorage for resilience
            const token = localStorage.getItem('token');
            if (token) {
                this.state.user.sessionToken = token;
            }
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                this.state.user.refreshToken = refreshToken;
            }
            const user = localStorage.getItem('user');
            if (user) {
                this.state.user.profile = JSON.parse(user);
                this.state.user.isLoggedIn = true;
            }
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            if (isLoggedIn === 'true') {
                this.state.user.isLoggedIn = true;
            }
        } catch (error) {
            // Silently handle localStorage errors
        }
    }

    // Save state to localStorage
    saveToStorage() {
        try {
            // Create a copy of the state to save, but exclude the 'properties'
            // array. This prevents stale or mock property data from being
            // persisted in localStorage between sessions. Properties should
            // always be fetched fresh from the API.
            const stateToSave = { ...this.state };
            delete stateToSave.properties;
            localStorage.setItem('airbnb_app_state', JSON.stringify(stateToSave));
        } catch (error) {
            // Silently handle localStorage errors
        }
    }

    // User Management
    login(userData) {
        this.setState({
            user: {
                isLoggedIn: true,
                profile: userData.profile,
                sessionToken: userData.token,
                refreshToken: userData.refreshToken
            }
        });
    }

    logout() {
        // Clear relevant items from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('airbnb_app_state');
        this.setState({
            user: {
                isLoggedIn: false,
                profile: null,
                sessionToken: null,
                refreshToken: null
            },
            bookings: [],
            wishlist: []
        });
    }

    updateProfile(profileData) {
        this.setState({
            user: {
                ...this.state.user,
                profile: { ...this.state.user.profile, ...profileData }
            }
        });
    }

    // Booking Management
    addBooking(booking) {
        const newBooking = {
            id: Date.now().toString(),
            ...booking,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        this.setState({
            bookings: [...this.state.bookings, newBooking]
        });

        return newBooking;
    }

    cancelBooking(bookingId) {
        this.setState({
            bookings: this.state.bookings.map(booking =>
                booking.id === bookingId
                    ? { ...booking, status: 'cancelled' }
                    : booking
            )
        });
    }

    getBookings(status = null) {
        if (status) {
            return this.state.bookings.filter(booking => booking.status === status);
        }
        return this.state.bookings;
    }

    // Wishlist Management
    addToWishlist(property) {
        if (!this.state.wishlist.find(item => item.id === property.id)) {
            this.setState({
                wishlist: [...this.state.wishlist, { ...property, addedAt: new Date().toISOString() }]
            });
        }
    }

    removeFromWishlist(propertyId) {
        this.setState({
            wishlist: this.state.wishlist.filter(item => item.id !== propertyId)
        });
    }

    isInWishlist(propertyId) {
        return this.state.wishlist.some(item => item.id === propertyId);
    }

    // Search Management
    updateSearch(searchData) {
        this.setState({
            search: { ...this.state.search, ...searchData }
        });
    }

    updateSearchFilters(filters) {
        this.setState({
            search: {
                ...this.state.search,
                filters: { ...this.state.search.filters, ...filters }
            }
        });
    }

    setCurrentPage(page) {
        this.setState({
            search: { ...this.state.search, currentPage: page }
        });
    }

    // Properties Management
    setProperties(properties) {
        this.setState({ properties });
    }

    getFilteredProperties() {
        let filtered = [...this.state.properties];
        const { filters, sortBy } = this.state.search;

        // Apply filters
        if (filters.price) {
            filtered = filtered.filter(property => {
                const price = property.price;
                switch (filters.price) {
                    case '0-5000': return price < 5000;
                    case '5000-10000': return price >= 5000 && price < 10000;
                    case '10000-20000': return price >= 10000 && price < 20000;
                    case '20000+': return price >= 20000;
                    default: return true;
                }
            });
        }

        if (filters.rating) {
            filtered = filtered.filter(property => {
                const rating = property.rating;
                switch (filters.rating) {
                    case '4.5+': return rating >= 4.5;
                    case '4.0+': return rating >= 4.0;
                    case '3.5+': return rating >= 3.5;
                    default: return true;
                }
            });
        }

        if (filters.propertyType) {
            filtered = filtered.filter(property =>
                property.type && property.type.toLowerCase() === filters.propertyType.toLowerCase()
            );
        }

        if (filters.amenities) {
            filtered = filtered.filter(property =>
                property.amenities && property.amenities.includes(filters.amenities)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'rating':
                    return b.rating - a.rating;
                case 'newest':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    getPaginatedProperties() {
        const filtered = this.getFilteredProperties();
        const { currentPage, itemsPerPage } = this.state.search;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        return {
            properties: filtered.slice(startIndex, endIndex),
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / itemsPerPage),
            currentPage,
            hasNext: endIndex < filtered.length,
            hasPrev: currentPage > 1
        };
    }

    // Notifications Management
    addNotification(notification) {
        const newNotification = {
            id: Date.now().toString(),
            ...notification,
            read: false,
            createdAt: new Date().toISOString()
        };

        this.setState({
            notifications: [newNotification, ...this.state.notifications]
        });

        return newNotification;
    }

    markNotificationAsRead(notificationId) {
        this.setState({
            notifications: this.state.notifications.map(notif =>
                notif.id === notificationId
                    ? { ...notif, read: true }
                    : notif
            )
        });
    }

    getUnreadCount() {
        return this.state.notifications.filter(notif => !notif.read).length;
    }

    // Host Applications Management
    getHostApplications(status = null) {
        if (status) {
            return this.state.hostApplications.filter(app => app.status === status);
        }
        return this.state.hostApplications;
    }

    getApplicationStats() {
        const apps = this.state.hostApplications;
        const total = apps.length;
        const approved = apps.filter(app => app.status === 'approved').length;
        const pending = apps.filter(app => app.status === 'under_review').length;
        const rejected = apps.filter(app => app.status === 'rejected').length;
        const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

        return {
            total,
            approved,
            pending,
            rejected,
            approvalRate
        };
    }

    updateHostApplicationStatus(id, status, notes = '') {
        this.setState({
            hostApplications: this.state.hostApplications.map(app =>
                app.id === id
                    ? { ...app, status, notes: notes || app.notes }
                    : app
            )
        });
    }

    // Users Management
    getUsers(status = null) {
        if (status) {
            return this.state.users.filter(user => user.status === status);
        }
        return this.state.users;
    }

    getUsersByRole(role = null) {
        if (role) {
            return this.state.users.filter(user => user.role === role);
        }
        return this.state.users;
    }

    updateUserStatus(id, status, reason = '') {
        this.setState({
            users: this.state.users.map(user =>
                user.id === id
                    ? { ...user, status, suspensionReason: reason || user.suspensionReason }
                    : user
            )
        });
    }

    updateUser(id, updates) {
        this.setState({
            users: this.state.users.map(user =>
                user.id === id ? { ...user, ...updates } : user
            )
        });
    }

    removeUser(id) {
        this.setState({
            users: this.state.users.filter(user => user.id !== id)
        });
    }

    removeProperty(id) {
        this.setState({
            properties: this.state.properties.filter(property => property.id !== id)
        });
    }

    updateProperty(id, updates) {
        this.setState({
            properties: this.state.properties.map(property =>
                property.id === id ? { ...property, ...updates } : property
            )
        });
    }

    // Properties Management (additional methods)
    getProperties(status = null) {
        if (status) {
            return this.state.properties.filter(property => property.status === status);
        }
        return this.state.properties;
    }

    updatePropertyStatus(id, status, reason = '') {
        this.setState({
            properties: this.state.properties.map(property =>
                property.id === id
                    ? { ...property, status, suspensionReason: reason || property.suspensionReason }
                    : property
            )
        });
    }

    // Bookings Management (additional methods)
    getAllBookings(status = null) {
        if (status) {
            return this.state.bookings.filter(booking => booking.status === status);
        }
        return this.state.bookings;
    }

    updateBookingStatus(id, status, reason = '') {
        this.setState({
            bookings: this.state.bookings.map(booking =>
                booking.id === id
                    ? { ...booking, status, cancellationReason: reason || booking.cancellationReason }
                    : booking
            )
        });
    }

    // Emails Management
    getEmails(status = null) {
        if (status) {
            return this.state.emails.filter(email => email.status === status);
        }
        return this.state.emails;
    }

    // Reports Management
    getReports(type = null) {
        if (type) {
            return this.state.reports.filter(report => report.type === type);
        }
        return this.state.reports;
    }

    // Utility methods
    clearAllData() {
        localStorage.clear(); // Clears everything for the domain
        this.state = {
            user: { isLoggedIn: false, profile: null, sessionToken: null, refreshToken: null },
            bookings: [],
            wishlist: [],
            search: {
                location: '',
                checkin: '',
                checkout: '',
                filters: { price: '', rating: '', propertyType: '', amenities: '' },
                sortBy: 'recommended',
                currentPage: 1,
                itemsPerPage: 6
            },
            properties: [],
            notifications: []
        };
        this.notify();
    }
}

// Create global store instance
const store = new Store();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = store;
}
