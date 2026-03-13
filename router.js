// Simple Router implementation
const router = {
    routes: {},

    addRoute(path, handler) {
        this.routes[path] = handler;
    },

    navigate(path) {
        // Handle dynamic routes like /property/:id
        const pathParts = path.split('/');
        const routeKeys = Object.keys(this.routes);

        for (const routeKey of routeKeys) {
            const routeParts = routeKey.split('/');
            if (routeParts.length === pathParts.length) {
                let match = true;
                const params = {};

                for (let i = 0; i < routeParts.length; i++) {
                    if (routeParts[i].startsWith(':')) {
                        // Dynamic parameter
                        const paramName = routeParts[i].substring(1);
                        params[paramName] = pathParts[i];
                    } else if (routeParts[i] !== pathParts[i]) {
                        match = false;
                        break;
                    }
                }

                if (match) {
                    if (this.routes[routeKey]) {
                        // Pass parameters to the handler
                        const paramValues = Object.values(params);
                        this.routes[routeKey](...paramValues);
                        return;
                    }
                }
            }
        }

        // Fallback to exact match
        if (this.routes[path]) {
            this.routes[path]();
        } else {
            console.error('Route not found:', path);
        }
    }
};

// Make router globally available
window.router = router;

// Helper function for navigation
window.navigateTo = function(path) {
    if (window.router) {
        window.router.navigate(path);
    } else {
        console.error('Router not loaded yet');
    }
};

// Function to load content dynamically
function loadContent(url, initialForm) {
    // Console log removed
    // Use relative paths for fetching content. This is more robust for local development.
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let bodyContent = doc.body.innerHTML;

            // If body is empty (content is just a div), use the document content
            if (!bodyContent.trim()) {
                bodyContent = html;
            }

            document.getElementById('main-content-area').innerHTML = bodyContent;

            // Load head content (styles and scripts)
            const headLinks = doc.querySelectorAll('link[rel="stylesheet"]');
            headLinks.forEach(link => {
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = link.href;
                document.head.appendChild(newLink);
            });

            const headScripts = doc.head.querySelectorAll('script');
            headScripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.head.appendChild(newScript);
            });

            // Execute body scripts
            const bodyScripts = doc.body.querySelectorAll('script');
            bodyScripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.body.appendChild(newScript);
            });

            // Also execute scripts that are in the inserted content
            const mainContentArea = document.getElementById('main-content-area');
            const insertedScripts = mainContentArea.querySelectorAll('script');
            insertedScripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.body.appendChild(newScript);
                // Remove the original script tag
                script.remove();
            });

            // Re-initialize auth logic if available
            if (typeof initializeAuth === 'function') {
                initializeAuth(initialForm);
            }
        })
        .catch(error => console.error('Error loading content:', error));
}

// Role to Dashboard Mapping (Confirmed by user)
const roleDashboardMap = {
    'customer': 'customer-dashboard.html',
    'host': 'host-dashboard-upgraded.html',
    'admin': 'admin-dashboard.html',
    'support': 'support-dashboard-upgraded.html',
    'platform_master_hub': 'platform-master-hub-fixed.html'
};

// Get redirect URL based on role
function getDashboardByRole(role) {
    return roleDashboardMap[role] || 'customer-dashboard.html';
}

// Routes - Updated to redirect to auth.html
router.addRoute('/login', () => window.location.href = 'auth.html?form=login');
router.addRoute('/signup', () => window.location.href = 'auth.html?form=signup');
router.addRoute('/dashboard', () => {
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
        user = null;
    }
    if (!user || !user.role) {
        console.error('Invalid user data or not logged in');
        window.location.href = 'auth.html?form=login';
        return;
    }
    
    const role = user.role;
    const dashboardUrl = getDashboardByRole(role);
    
    if (dashboardUrl) {
        window.location.href = dashboardUrl;
    } else {
        console.error('Unknown user role:', role);
        window.location.href = 'auth.html?form=login';
    }
});
router.addRoute('/admin-dashboard', () => loadContent('admin-dashboard.html'));
router.addRoute('/support-dashboard', () => loadContent('support-dashboard-upgraded.html'));
router.addRoute('/host-dashboard', () => loadContent('host-dashboard-upgraded.html'));
router.addRoute('/customer-dashboard', () => loadContent('customer-dashboard.html'));
router.addRoute('/add-property', () => loadContent('add-property.html'));
router.addRoute('/property-listing', () => window.location.href = 'property-listing.html');
router.addRoute('/live-tours', () => window.location.href = 'live-tours.html');
router.addRoute('/help', () => window.location.href = 'help.html');

// Property view route - handles /property/:id
router.addRoute('/property/:id', (id) => {
    if (id) {
        // Store the property ID for the property view page
        sessionStorage.setItem('currentPropertyId', id);
        // Navigate to the property view page
        window.location.href = 'property-view.html';
    } else {
        console.error('Property ID not provided');
        window.location.href = 'index.html';
    }
});
