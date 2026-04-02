// Admin Dashboard Functions - Clean Version
// Global sidebar state
let sidebarCollapsed = false;

// Sidebar toggle functionality - Fixed version
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const toggleBtn = document.getElementById('sidebarToggle') || document.querySelector('.menu-toggle');
    const closeBtn = document.getElementById('sidebarClose') || document.getElementById('sidebarCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay') || document.getElementById('sidebarBackdrop');

    // Ensure button is properly set up
    if (!toggleBtn) {
        return;
    }

    // Single click handler for toggle button
    toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });

    // Close button handler - ensure it's properly attached
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
    }

    // Overlay click handler
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
    }

    function toggleSidebar() {
        if (sidebarCollapsed) {
            openSidebar();
        } else {
            closeSidebar();
        }
    }

    function openSidebar() {
        if (sidebar) {
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.classList.add('sidebar-expanded');
            sidebar.classList.add('active'); // For mobile
            sidebar.style.pointerEvents = 'auto';
            sidebar.style.width = '';
            sidebar.style.transform = ''; // Reset transform for desktop
        }
        if (mainContent) {
            mainContent.classList.remove('ml-20');
            mainContent.classList.add('ml-72');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('active');
        }

        sidebarTexts.forEach(text => {
            text.classList.remove('hidden');
            text.style.display = 'inline';
        });
        sidebarCollapsed = false;
    }
}

// Global closeSidebar function
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const isMobile = window.innerWidth <= 768;

    // Fully collapse and hide the sidebar
    if (sidebar) {
        sidebar.classList.add('sidebar-collapsed');
        sidebar.classList.remove('sidebar-expanded');
        sidebar.classList.remove('active'); // For mobile
        sidebar.style.pointerEvents = 'auto';
        
        // Set width based on screen size
        if (isMobile) {
            sidebar.style.width = '280px';
            sidebar.style.transform = 'translateX(-100%)'; // Hide on mobile
        } else {
            sidebar.style.width = '60px';
            sidebar.style.transform = '';
        }
    }

    // Reset main content margin
    if (mainContent) {
        mainContent.classList.remove('ml-72');
        if (isMobile) {
            mainContent.classList.remove('ml-20');
        } else {
            mainContent.classList.add('ml-20');
        }
    }

    // Remove overlay
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
    }

    // Hide all sidebar text
    sidebarTexts.forEach(text => {
        text.classList.add('hidden');
        text.style.display = 'none';
    });
    sidebarCollapsed = true;
}

// Navigation functionality - Enhanced for better button responsiveness
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .sidebar-item');

    navItems.forEach(item => {
        // Remove existing event listeners to prevent duplicates
        item.onclick = null;
        item.removeEventListener('click', item._clickHandler);

        // Primary click handler
        item.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const pageId = this.getAttribute('data-page');
            if (pageId) {
                navigateToPage(this, pageId);
            }
        };

        // Backup event listener
        item._clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const pageId = this.getAttribute('data-page');
            if (pageId) {
                navigateToPage(this, pageId);
            }
        };
        item.addEventListener('click', item._clickHandler);

        // Add cursor pointer
        item.style.cursor = 'pointer';
    });
}

    // Navigate to page function - Enhanced with better state management (compatible with both navigateToPage and navigateTo)
    // Removed or commented out to prevent conflict with admin-dashboard.html's internal navigation
    /* window.navigateToPage = window.navigateTo = function(element, pageId) {
        // Validate element and pageId
        if (!element || !pageId) {
            return;
        }

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked item
    element.classList.add('active');

    // Hide all pages with better visibility handling
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
        page.style.display = 'none';
    });

    // Show selected page with modern display logic
    const pageElement = document.getElementById(pageId) || document.getElementById(pageId + 'Page');
    if (pageElement) {
        pageElement.classList.remove('hidden');
        pageElement.style.display = 'grid'; // Modern layouts often use grid
    } else {
        console.error(`Page ID ${pageId} not found`); return;
    }

    // Lazy-initialize page specific data
    const pageInitMap = {
        'hostsPage': initializeHostManagement,
        'customersPage': initializeCustomerManagement,
        'propertiesPage': initializePropertiesManagement,
        'analyticsPage': initializeAnalyticsPage
    };

    if (pageInitMap[pageId]) {
        try { pageInitMappageId; } catch (e) { console.error('Init failed', e); }
    }
};
window.navigateTo = window.navigateToPage;
    // Close the sidebar after navigation (optional, only on mobile)
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

// Initialize Leaflet map
function initializeMap() {
    try {
        const mapElement = document.getElementById('activityMap');
        if (!mapElement) {
            console.warn('Map element not found');
            return;
        }

        const map = L.map('activityMap').setView([-1.2864, 36.8172], 6); // Nairobi coordinates

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add activity markers
        const locations = [
            { lat: -1.2864, lng: 36.8172, intensity: 10, city: 'Nairobi' },
            { lat: -4.0435, lng: 39.6682, intensity: 8, city: 'Mombasa' },
            { lat: 0.5143, lng: 35.2698, intensity: 6, city: 'Eldoret' },
            { lat: -0.0917, lng: 34.7679, intensity: 5, city: 'Kisumu' },
            { lat: -0.3031, lng: 36.0800, intensity: 4, city: 'Nakuru' }
        ];

        locations.forEach(location => {
            const circle = L.circle([location.lat, location.lng], {
                color: '#00ffff',
                fillColor: '#00ffff',
                fillOpacity: 0.3,
                radius: location.intensity * 10000
            }).addTo(map);

            circle.bindPopup(`<b>${location.city}</b><br>Activity Level: ${location.intensity}/10`);
        });
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Initialize Chart.js
function initializeChart() {
    try {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) {
            console.warn('Chart element not found');
            return;
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Revenue (Ksh)',
                    data: [85000, 92000, 78000, 115000, 132000, 141000, 158000, 162000, 139000, 121000, 118000, 127500],
                    borderColor: '#00ffff',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00ffff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#00ffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff',
                            callback: function(value) {
                                return 'Ksh ' + (value / 1000) + 'K';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBorderWidth: 3
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// Setup header search functionality
function setupHeaderSearch() {
    const searchInput = document.getElementById('headerSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    // Implement search functionality
                    console.log('Searching for:', query);
                    alert('Search functionality: ' + query);
                }
            }
        });
    }
}

// Initialize admin dashboard functionality
function initializeAdminDashboard() {
    console.log('Initializing admin dashboard...');

    // Setup all functionality
    setupSidebarToggle();
    setupNavigation();
    initializeMap();
    initializeChart();
    setupHeaderSearch();

    // Initialize default page (dashboard)
    const activeNavItem = document.querySelector('.nav-item.active');
    if (activeNavItem) {
        const pageId = activeNavItem.getAttribute('data-page');
        if (pageId) {
            navigateToPage(activeNavItem, pageId);
        }
    }

    console.log('Admin dashboard initialized successfully');
}

// Initialize analytics page
function initializeAnalyticsPage() {
    console.log('Initializing analytics page...');
    // Analytics page specific initialization can go here
}

// Initialize host management
function initializeHostManagement() {
    console.log('Initializing host management...');
    loadHosts();
    setupHostSorting();
}

// Store hosts globally for sorting
let allHosts = [];
let hostSortConfig = { key: null, direction: 'asc' };
// Store customers globally for access in view functions
let customersData = [];

// Initialize customer management
function initializeCustomerManagement() {
    console.log('Initializing customer management...');
    loadCustomers();
}

function setupHostSorting() {
    const hostTable = document.getElementById('hostTable');
    if (!hostTable) return;

    const header = hostTable.querySelector('.table-header');
    if (header) {
        // Assuming 6th column is Total Revenue
        const revenueHeader = header.children[5];
        if (revenueHeader && !revenueHeader.dataset.sortKey) {
            revenueHeader.setAttribute('data-sort-key', 'revenue');
            revenueHeader.style.cursor = 'pointer';
            revenueHeader.addEventListener('click', () => sortHostsBy('revenue'));
        }
    }
}

// Specific emails to filter out (mock hosts)
// Set to empty array to show all users
const SPECIFIC_EMAILS = [];

// API call wrapper function
async function apiCall(endpoint, options = {}) {
    try {
        // Use the global api instance if available
        if (window.api && window.api.request) {
            return await window.api.request(endpoint, options);
        } else {
            // Fallback to direct fetch if api is not available
            const baseURL = 'http://localhost:3001/api/v1';
            const url = `${baseURL}${endpoint}`;
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            };

            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        }
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

async function loadHosts() {
    await fetchAndDisplayUsers('host');
}

async function loadCustomers() {
    await fetchAndDisplayUsers('customer');
}

async function fetchAndDisplayUsers(role) {
    try {
        console.log(`Loading ${role}s from API...`);
        let users = [];

        if (window.api && window.api.getUsers) {
            users = await window.api.getUsers(role);
            // Ensure users is an array
            if (!Array.isArray(users)) {
                users = users.data || [];
            }
        } else {
            // Fallback to direct API call if window.api not available
            const response = await apiCall('/user/admin/all');
            if (Array.isArray(response)) {
                users = response.filter(user => user.role === role);
            } else if (response && response.data && Array.isArray(response.data)) {
                users = response.data.filter(user => user.role === role);
            }
        }

        if (role === 'host') {
            allHosts = users; // Store for sorting
            console.log('Hosts loaded:', users.length);
            displayHosts(users);
        } else if (role === 'customer') {
            console.log('Customers loaded:', users.length);
            const filteredCustomers = SPECIFIC_EMAILS.length > 0 ?
                users.filter(c => !SPECIFIC_EMAILS.includes(c.email)) :
                users;

            customersData = filteredCustomers;
            displayCustomers(filteredCustomers);
        }
    } catch (error) {
        console.error(`Error loading ${role}s:`, error);
        // Show user-friendly error message
        showErrorMessage(`Failed to load ${role}s. Please check your connection and try again.`);
        if (role === 'host') displayHosts([]);
        else displayCustomers([]);
    }
}

function sortHostsBy(key) {
    if (hostSortConfig.key === key) {
        hostSortConfig.direction = hostSortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        hostSortConfig.key = key;
        hostSortConfig.direction = 'asc';
    }

    const sortedHosts = [...allHosts].sort((a, b) => {
        let valA, valB;

        if (key === 'revenue') {
            valA = a.bookings ? a.bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0) : 0;
            valB = b.bookings ? b.bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0) : 0;
        } else {
            // Fallback for other keys if needed
            valA = a[key] || 0;
            valB = b[key] || 0;
        }

        if (valA < valB) {
            return hostSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return hostSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    displayHosts(sortedHosts);
}

function displayHosts(hosts) {
    const hostTable = document.getElementById('hostTable') || document.getElementById('hostsTable');
    if (!hostTable) return;

    const tableBody = hostTable.querySelector('.table-body') || hostTable.querySelector('tbody') || hostTable;
    let html = '';

    hosts.forEach(host => {
        const propertiesCount = host.properties ? host.properties.length : 0;
        const bookingsCount = host.bookings ? host.bookings.length : 0;
        const earnings = host.bookings ?
            host.bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0) : 0;

        html += `
            <div class="table-row">
                <div class="host-avatar">
                    <img src="${host.profileImage || '/images/placeholder-property.jpg'}" alt="${host.firstName}" />
                </div>
                <div class="host-name">${host.firstName} ${host.lastName}</div>
                <div class="host-email">${host.email}</div>
                <div class="host-phone">${host.phone || 'N/A'}</div>
                <div class="host-properties">${propertiesCount}</div>
                <div class="host-revenue">Ksh ${earnings.toLocaleString()}</div>
                <div class="host-status status-${host.status}">${host.status}</div>
                <div class="action-buttons">
                    <button class="btn-view-profile" onclick="viewHostProfile('${host.id}')">View Profile</button>
                    <button class="btn-view-properties" onclick="viewHostProperties('${host.id}')">Properties</button>
                    <button class="btn-edit" onclick="editHost('${host.id}')">Edit</button>
                </div>
            </div>
        `;
    });

    // Replace existing rows or add to table
    const existingRows = tableBody.querySelectorAll('.table-row');
    existingRows.forEach(row => row.remove());
    tableBody.insertAdjacentHTML('beforeend', html);
}

function displayCustomers(customers) {
    const customerTable = document.getElementById('customerTable') || document.getElementById('customersTable');
    if (!customerTable) return;

    const tableBody = customerTable.querySelector('.table-body') || customerTable.querySelector('tbody') || customerTable;
    let html = '';

    customers.forEach(customer => {
        const bookingsCount = customer.bookings ? customer.bookings.length : 0;
        const totalPaid = customer.bookings ?
            customer.bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0) : 0;

        html += `
            <div class="table-row">
                <div class="customer-avatar">
                    <img src="${customer.profileImage || '/images/placeholder-property.jpg'}" alt="${customer.firstName}" />
                </div>
                <div class="customer-name">${customer.firstName} ${customer.lastName}</div>
                <div class="customer-email">${customer.email}</div>
                <div class="customer-bookings">${bookingsCount}</div>
                <div class="customer-paid">Ksh ${totalPaid.toLocaleString()}</div>
                <div class="customer-status status-${customer.status}">${customer.status}</div>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewCustomerProfile('${customer.id}')">View</button>
                    <button class="btn-edit" onclick="editCustomer('${customer.id}')">Edit</button>
                    <button class="btn-block" onclick="blockCustomer('${customer.id}')">Block</button>
                </div>
            </div>
        `;
    });

    // Replace existing rows or add to table
    const existingRows = tableBody.querySelectorAll('.table-row');
    existingRows.forEach(row => row.remove());
    tableBody.insertAdjacentHTML('beforeend', html);
}

// Placeholder functions for actions
function viewHostProfile(hostId) {
    console.log('View host profile:', hostId);
    alert('Host profile view not implemented yet');
}

function viewHostProperties(hostId) {
    console.log('View host properties:', hostId);
    alert('Host properties view not implemented yet');
}

function editHost(hostId) {
    console.log('Edit host:', hostId);
    alert('Host edit not implemented yet');
}

function viewCustomerProfile(customerId) {
    const customer = customersData.find(c => c.id == customerId);
    if (!customer) {
        console.error('Customer not found:', customerId);
        return;
    }

    // Populate profile panel
    const setContent = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
    const setSrc = (id, src) => { const el = document.getElementById(id); if(el) el.src = src; };

    setSrc('customerPanelAvatar', customer.profileImage || 'https://via.placeholder.com/150');
    setContent('customerPanelName', `${customer.firstName} ${customer.lastName}`);
    setContent('customerPanelEmail', customer.email);
    
    // Profile Tab Details
    setContent('customerProfileName', `${customer.firstName} ${customer.lastName}`);
    setContent('customerProfileEmail', customer.email);
    setContent('customerProfilePhone', customer.phone || 'N/A');
    setContent('customerProfileStatus', (customer.status || 'active').charAt(0).toUpperCase() + (customer.status || 'active').slice(1));
    setContent('customerProfileBookings', customer.bookings ? customer.bookings.length : 0);
    setContent('customerProfileSpent', `Ksh ${(customer.bookings ? customer.bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) : 0).toLocaleString()}`);

    // Reset tabs and show profile content
    document.querySelectorAll('#customerPanel .panel-tab').forEach(tab => tab.classList.remove('active'));
    const profileTab = document.querySelector('#customerPanel .panel-tab[data-tab="profile"]');
    if(profileTab) profileTab.classList.add('active');
    
    document.querySelectorAll('#customerPanel .tab-content').forEach(content => content.classList.add('hidden'));
    const profileContent = document.getElementById('customerProfileTab');
    if(profileContent) profileContent.classList.remove('hidden');

    const panel = document.getElementById('customerPanel');
    if(panel) panel.classList.add('open');
}

function editCustomer(customerId) {
    console.log('Edit customer:', customerId);
    alert('Customer edit not implemented yet');
}

function blockCustomer(customerId) {
    console.log('Block customer:', customerId);
    alert('Customer block not implemented yet');
}

// Initialize properties management
function initializePropertiesManagement() {
    console.log('Initializing properties management...');
    loadProperties();
}

async function loadProperties() {
    try {
        console.log('Loading properties from API...');
        let properties = [];

        if (window.api && window.api.getAllProperties) {
            properties = await window.api.getAllProperties();
            // Ensure properties is an array
            if (!Array.isArray(properties)) {
                properties = properties.data || [];
            }
        } else {
            // Fallback to direct API call
            const response = await apiCall('/properties/admin/all');
            properties = response.data || response || [];
        }

        displayProperties(properties);
    } catch (error) {
        console.error('Error loading properties:', error);
        // Show user-friendly error message
        showErrorMessage('Failed to load properties. Please check your connection and try again.');
        displayProperties([]);
    }
}

function displayProperties(properties) {
    const tableBody = document.getElementById('propertiesTable');
    if (!tableBody) return;
    
    // Clear existing rows
    const rows = tableBody.querySelectorAll('.table-row');
    rows.forEach(row => row.remove());

    let html = '';
    properties.forEach(property => {
        html += `
            <div class="table-row">
                <div><img src="${property.images && property.images[0] ? property.images[0] : '/images/placeholder-property.jpg'}" alt="${property.title}" class="property-image"></div>
                <div>
                    <div class="property-title">${property.title}</div>
                    <div class="property-host">${property.host ? property.host.firstName + ' ' + property.host.lastName : 'Unknown'}</div>
                </div>
                <div class="property-location">${property.location}</div>
                <div class="property-price">Ksh ${property.price.toLocaleString()}</div>
                <div class="property-rating">⭐ ${property.rating || 'N/A'}</div>
                <div class="property-status status-${property.status}">${property.status.charAt(0).toUpperCase() + property.status.slice(1)}</div>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewProperty('${property.id}')">View</button>
                    <button class="btn-edit" onclick="editProperty('${property.id}')">Edit</button>
                </div>
            </div>
        `;
    });
    
    tableBody.insertAdjacentHTML('beforeend', html);
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

// Toast notification system (unified)
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
    `;
    document.body.appendChild(container);
    return container;
}

// Missing functions from HTML inline scripts
window.toggleSidebar = function() {
    if (typeof setupSidebarToggle === 'function') {
        setupSidebarToggle();
    }
    const sidebarCollapsed = window.sidebarCollapsed || false;
    window.sidebarCollapsed = !sidebarCollapsed;
    
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const header = document.getElementById('header');
    
    if (window.innerWidth <= 1024) {
        if (sidebarCollapsed) {
            sidebar?.classList.remove('active');
            document.getElementById('sidebarBackdrop')?.classList.remove('active');
        } else {
            sidebar?.classList.add('active');
            document.getElementById('sidebarBackdrop')?.classList.add('active');
        }
    } else {
        if (sidebarCollapsed) {
            sidebar.style.width = '80px';
            sidebar.classList.add('collapsed');
            header?.classList.add('sidebar-collapsed');
            mainContent?.classList.add('sidebar-collapsed');
        } else {
            sidebar.style.width = '280px';
            sidebar.classList.remove('collapsed');
            header?.classList.remove('sidebar-collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
        }
    }
};

window.closeSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop') || document.getElementById('sidebarOverlay');
    sidebar?.classList.remove('active');
    backdrop?.classList.remove('active');
};

window.navigateTo = function(page, element) {
    if (typeof navigateToPage === 'function') {
        navigateToPage(element, page + 'Page');
    }
};

window.showNotifications = function() {
    showToast('You have 5 new notifications', 'info');
};

window.handleLogout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Auto-initialize when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminDashboard);
} else {
    initializeAdminDashboard();
}

// Export functions for global access
window.initializeAdminDashboard = initializeAdminDashboard;
window.setupSidebarToggle = setupSidebarToggle;
window.closeSidebar = closeSidebar;
window.navigateToPage = navigateToPage;
