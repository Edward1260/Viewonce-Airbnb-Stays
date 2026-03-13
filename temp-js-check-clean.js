// Check authentication
document.addEventListener('DOMContentLoaded', function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!isLoggedIn || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    setupSidebarToggle();
    setupNavigation();
    initializeMap();
    initializeChart();
    setupHeaderSearch();

    // Initialize default page (dashboard)
    navigateToPage(document.querySelector('.nav-item.active'), 'dashboardPage');
});

// Global sidebar state
let sidebarCollapsed = false;

// Sidebar toggle functionality - Fixed version
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

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
            // Opening sidebar - expand it
            openSidebar();
        } else {
            // Closing sidebar - collapse it
            closeSidebar();
        }
    }

    function openSidebar() {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-expanded');
        sidebar.style.pointerEvents = 'auto';
        sidebar.style.width = '';
        mainContent.classList.remove('ml-20');
        mainContent.classList.add('ml-72');
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

    // Collapse the sidebar
    sidebar.classList.add('sidebar-collapsed');
    sidebar.classList.remove('sidebar-expanded');
    sidebar.style.pointerEvents = 'auto'; // Keep pointer events enabled
    sidebar.style.width = '60px';
    mainContent.classList.remove('ml-72');
    mainContent.classList.add('ml-20');
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
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
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
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const pageId = this.getAttribute('data-page');
            if (pageId) {
                navigateToPage(this, pageId);
            }
        });

        // Add cursor pointer
        item.style.cursor = 'pointer';
    });
}

// Navigate to page function - Enhanced with better state management
function navigateToPage(element, pageId) {
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

    // Show selected page
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.remove('hidden');
        pageElement.style.display = 'block';
    } else {
        return;
    }

    // Initialize specific page functionality
    try {
        if (pageId === 'hostsPage') {
            initializeHostManagement();
        } else if (pageId === 'customersPage') {
            initializeCustomerManagement();
        } else if (pageId === 'propertiesPage') {
            initializePropertiesManagement();
        } else if (pageId === 'analyticsPage') {
            initializeAnalyticsPage();
        }
    } catch (error) {
    }

    // Close the sidebar after navigation (optional, only on mobile)
    if (window.innerWidth < 768) {
        closeSidebar();
    }
}

// Initialize Leaflet map
function initializeMap() {
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
}

// Initialize Chart.js
function initializeChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Revenue (Ksh)',
                data: [85000, 92000, 78000, 115000, 132000, 141000, 158000, 162000, 139000, 121000, 118000,
127500],
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

    // Initialize AI Analytics Chart
    const aiCtx = document.getElementById('aiAnalyticsChart').getContext('2d');
    const aiGradient = aiCtx.createLinearGradient(0, 0, 0, 400);
    aiGradient.addColorStop(0, 'rgba(0, 191, 255, 0.5)');
    aiGradient.addColorStop(1, 'rgba(0, 191, 255, 0.1)');

    new Chart(aiCtx, {
        type: 'bar',
        data: {
            labels: ['AI Predictions', 'Data Analysis', 'Risk Assessment', 'Trend Forecasting', 'Performance Metrics'],
            datasets: [{
                label: 'AI Confidence Score (%)',
                data: [95, 87, 92, 89, 96],
                backgroundColor: aiGradient,
                borderColor: '#00bfff',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
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
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Add some interactive effects
document.querySelectorAll('.glass-hover').forEach(element => {
    element.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-4px) scale(1.02)';
    });

    element.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// AI status pulse effect
setInterval(() => {
    const aiStatus = document.querySelector('.ai-online');
    aiStatus.style.animation = 'none';
    setTimeout(() => {
        aiStatus.style.animation = 'ai-glow 2s infinite alternate';
    }, 10);
}, 4000);

// Menu toggle functionality
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');

    sidebar.classList.toggle('sidebar-collapsed');
    mainContent.classList.toggle('ml-20');
    mainContent.classList.toggle('ml-72');

    sidebarTexts.forEach(text => {
        text.classList.toggle('hidden');
    });
}

// Close sidebar function
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Fully collapse and hide the sidebar
    sidebar.classList.add('sidebar-collapsed');
    sidebar.classList.remove('sidebar-expanded');
    sidebar.style.pointerEvents = 'none'; // Disable pointer events when collapsed
    sidebar.style.width = '60px';

    // Reset main content margin
    mainContent.classList.remove('ml-72');
    mainContent.classList.add('ml-20');

    // Remove overlay
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
    }

    // Hide all sidebar text
    sidebarTexts.forEach(text => {
        text.classList.add('hidden');
        text.style.display = 'none';
    });
}

// Modal functions for top bar buttons
function showSearchModal() {
    document.getElementById('searchModal').classList.remove('hidden');
}

function showQuickAddModal() {
    document.getElementById('quickAddModal').classList.remove('hidden');
}

function showAIModal() {
    document.getElementById('aiModal').classList.remove('hidden');
}

function showInboxModal() {
    document.getElementById('inboxModal').classList.remove('hidden');
}

function showEnhancedNotificationsModal() {
    document.getElementById('notificationsModal').classList.remove('hidden');
}

function showSettingsModal() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function showHelpModal() {
    document.getElementById('helpModal').classList.remove('hidden');
}

function showProfileModal() {
    document.getElementById('profileModal').classList.remove('hidden');
    // Setup profile picture upload
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profilePicture = document.getElementById('profilePicture');
    const profileInitial = document.getElementById('profileInitial');

    profilePictureInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicture.src = e.target.result;
                profilePicture.classList.remove('hidden');
                profileInitial.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

function viewProfile() {
    alert('Viewing full profile...');
    // Implement view profile functionality
}

function accountSettings() {
    alert('Opening account settings...');
    // Implement account settings functionality
}

function privacySettings() {
    alert('Opening privacy settings...');
    // Implement privacy settings functionality
}

// Close modal function
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const modals = ['searchModal', 'quickAddModal', 'aiModal', 'inboxModal', 'notificationsModal',
'settingsModal', 'helpModal', 'profileModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');

        alert('Logged out successfully!');
        // Redirect to login page
        window.router.navigate('/login');
    }
}

function saveProfile() {
    const name = document.getElementById('adminFullName').value;
    const email = document.getElementById('adminEmail').value;
    const phone = document.getElementById('adminPhone').value;
    const address = document.getElementById('adminAddress').value;

    // Here you would typically send this data to your backend API
    // For now, we'll just show a success message
    alert('Profile updated successfully!\n\nName: ' + name + '\nEmail: ' + email + '\nPhone: ' + phone +
'\nAddress: ' + address);

    // Update the displayed name in the profile modal header
    document.getElementById('profileModal').querySelector('h3').textContent = name;
}

function changePassword() {
    alert('Password changed successfully!');
}

function showSettings() {
    // Navigate to settings page
    navigateToPage(document.querySelector('[data-page="settingsPage"]'), 'settingsPage');
    closeModal('profileModal');
}

// Placeholder functions for dashboard buttons
function viewAllTasks() {
    alert('Viewing all admin tasks...');
}

function investigateFraud() {
    alert('Investigating fraud alert...');
}

// Properties page functions
function addProperty() {
    alert('Add Property clicked - navigating to add-property.html');
    window.location.href = 'add-property.html';
}

function editProperty() {
    alert('Edit Property clicked');
}

function approveListing() {
    alert('Approve Listing clicked');
}

function rejectListing() {
    alert('Reject Listing clicked');
}

function deactivateProperty() {
    alert('Deactivate Property clicked');
}

function viewProperty() {
    alert('View Property clicked');
}

function featureProperty() {
    alert('Feature Property clicked');
}

function assignHost() {
    alert('Assign Host clicked');
}

function deleteProperty() {
    alert('Delete Property clicked');
}

// Host Management Functionality
let hosts = [];
let filteredHosts = [];
let currentHost = null;
let hostSortConfig = { key: null, direction: 'asc' };

async function initializeHostManagement() {
    try {
        const response = await api.getUsers('host');
        hosts = response.data || response || [];
    } catch (e) {
        hosts = [];
    }

    renderHostTable(hosts);
    setupHostSearch();
    setupHostSort();

    // Setup interactive elements
    setTimeout(() => {
        setupHostTabHandlers();
        setupHostFilterButtons();
        enhanceActionButtons('hostManagementSection');
    }, 100);
}

function setupHostSort() {
    const revenueHeader = document.querySelector('#hostTable .table-header > div:nth-child(6)');
    if (revenueHeader && !revenueHeader.dataset.sortKey) {
        revenueHeader.style.cursor = 'pointer';
        revenueHeader.setAttribute('data-sort-key', 'totalEarnings');
        revenueHeader.addEventListener('click', () => sortAndRenderHosts('totalEarnings'));
    }
}

function sortAndRenderHosts(key) {
    if (hostSortConfig.key === key) {
        hostSortConfig.direction = hostSortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        hostSortConfig.key = key;
        hostSortConfig.direction = 'asc';
    }

    const sortedHosts = [...hosts].sort((a, b) => {
        const valA = a[key] || 0;
        const valB = b[key] || 0;

        if (valA < valB) {
            return hostSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return hostSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    renderHostTable(sortedHosts);
}

function renderHostTable(hostList) {
    const tableBody = document.getElementById('hostTable');
    if (!tableBody) return;

    // Clear existing rows except header
    const rows = tableBody.querySelectorAll('.table-row');
    rows.forEach(row => row.remove());

    hostList.forEach(host => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div><img src="${host.avatar}" alt="${host.name}" class="host-avatar"></div>
            <div class="cursor-pointer" onclick="viewHostProfile(${host.id})">
                <div class="host-name">${host.name}</div>
                <div class="host-email">${host.email}</div>
            </div>
            <div class="host-location">${host.location || 'N/A'}</div>
            <div class="host-properties">${host.properties}</div>
            <div class="host-revenue">Ksh ${(host.totalEarnings || 0).toLocaleString()}</div>
            <div class="host-rating">⭐ ${host.rating || 'N/A'}</div>
            <div class="host-status status-${host.status}">${host.status.charAt(0).toUpperCase() +
host.status.slice(1)}</div>
            <div class="action-buttons">
                <button class="btn-view-profile" onclick="viewHostProfile(${host.id})">View</button>
                <button class="btn-view-properties" onclick="viewHostProperties(${host.id})">Properties</button>
                <button class="btn-edit" onclick="editHost(${host.id})">Edit</button>
                <button class="btn-remove" onclick="removeHost(${host.id})">Remove</button>
            </div>
        `;
        tableBody.appendChild(row);
    });
}

function setupHostFilterButtons() {
    const filterButtons = document.querySelectorAll('#hostManagementSection .filter-btn');
    filterButtons.forEach(button => {
        button.onclick = function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            filterHosts(filter);
        };
    });
}

function setupHostSearch() {
    const searchInput = document.getElementById('hostSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = hosts.filter(host =>
                host.name.toLowerCase().includes(query) ||
                host.email.toLowerCase().includes(query) ||
                host.phone.includes(query)
            );
            renderHostTable(filtered);
        });
    }
}

function viewHostProfile(hostId) {
    const host = hosts.find(h => h.id === hostId);
    if (!host) return;

    // Populate profile panel
    document.getElementById('panelAvatar').src = host.avatar;
    document.getElementById('panelName').textContent = host.name;
    document.getElementById('panelEmail').textContent = host.email;
    document.getElementById('profileName').textContent = host.name;
    document.getElementById('profileEmail').textContent = host.email;
    document.getElementById('profilePhone').textContent = host.phone;
    document.getElementById('profileStatus').textContent = host.status.charAt(0).toUpperCase() +
host.status.slice(1);
    document.getElementById('profileBookings').textContent = host.totalBookings;
    document.getElementById('profileEarnings').textContent = `Ksh ${host.totalEarnings.toLocaleString()}`;

    // Show profile tab and open panel
    document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('.panel-tab[data-tab="profile"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById('profileTab').classList.remove('hidden');

    document.getElementById('hostPanel').classList.add('open');
}

function viewHostProperties(hostId) {
    const host = hosts.find(h => h.id === hostId);
    if (!host) return;

    // Fetch properties for this host
    let hostProperties = [];
    api.getProperties().then(response => {
        const allProps = response.data || response || [];
        hostProperties = allProps.filter(p => p.hostId === hostId);
        renderHostProperties(hostProperties);
    }).catch(e => {});

    function renderHostProperties(props) {
        const propertiesGrid = document.getElementById('hostProperties');
        propertiesGrid.innerHTML = props.map(prop => `
        <div class="property-card">
            <img src="${prop.images && prop.images[0] ? prop.images[0] :
'https://via.placeholder.com/300x200'}" alt="${prop.title}" class="property-image">
            <div class="property-info">
                <div class="property-title">${prop.title}</div>
                <div class="property-details">${prop.location} • Ksh ${prop.price}/night</div>
                <div class="property-price">Status: ${prop.status}</div>
            </div>
        </div>
        `).join('');
    }

    // Switch to properties tab
    document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('.panel-tab[data-tab="properties"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById('propertiesTab').classList.remove('hidden');

    document.getElementById('hostPanel').classList.add('open');
}

function editHost(hostId) {
    const host = hosts.find(h => h.id === hostId);
    if (!host) return;

    // Populate edit form
    document.getElementById('editName').value = host.name;
    document.getElementById('editEmail').value = host.email;
    document.getElementById('editPhone').value = host.phone;
    document.getElementById('editStatus').value = host.status;

    // Switch to edit tab
    document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('.panel-tab[data-tab="edit"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById('editTab').classList.remove('hidden');

    document.getElementById('hostPanel').classList.add('open');
}

function removeHost(hostId) {
    if (confirm('Are you sure you want to remove this host?')) {
        hosts = hosts.filter(h => h.id !== hostId);
        renderHostTable(hosts);
        alert('Host removed successfully!');
    }
}



function initializePropertiesManagement() {
    // Load real properties from API
    loadProperties();
    setupPropertySearch();

    // Setup interactive elements
    setTimeout(() => {
        enhanceActionButtons('propertiesManagementSection');
    }, 100);
}

function renderPropertiesTable(propertyList) {
    const tableBody = document.getElementById('propertiesTable');
    if (!tableBody) return;

    // Clear existing rows except header
    const rows = tableBody.querySelectorAll('.table-row');
    rows.forEach(row => row.remove());

    propertyList.forEach(property => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div><img src="${property.images && property.images[0] ? property.images[0] :
'https://via.placeholder.com/100x80'}" alt="${property.title}" class="property-image"></div>
            <div>
                <div class="property-title">${property.title}</div>
                <div class="property-host">${property.host}</div>
            </div>
            <div class="property-location">${property.location}</div>
            <div class="property-price">Ksh ${property.price.toLocaleString()}</div>
            <div class="property-rating">⭐ ${property.rating}</div>
            <div class="property-status status-${property.status}">${property.status.charAt(0).toUpperCase() +
property.status.slice(1)}</div>
            <div class="action-buttons">
                <button class="btn-view" onclick="viewProperty(${property.id})">View</button>
                <button class="btn-edit" onclick="editProperty(${property.id})">Edit</button>
                <button class="btn-approve" onclick="approveProperty(${property.id})" style="display:
${property.status === 'pending' ? 'inline-block' : 'none'}">Approve</button>
                <button class="btn-reject" onclick="rejectProperty(${property.id})" style="display:
${property.status === 'pending' ? 'inline-block' : 'none'}">Reject</button>
                <button class="btn-suspend" onclick="suspendProperty(${property.id})" style="display:
${property.status === 'active' ? 'inline-block' : 'none'}">Suspend</button>
                <button class="btn-delete" onclick="deleteProperty(${property.id})">Delete</button>
            </div>
        `;
        tableBody.appendChild(row);
    });
}

function setupPropertySearch() {
    const searchInput = document.getElementById('propertySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const filtered = properties.filter(prop =>
                prop.title.toLowerCase().includes(query) ||
                prop.location.toLowerCase().includes(query) ||
                prop.host.toLowerCase().includes(query)
            );
            renderPropertiesTable(filtered);
        });
    }
}

function viewProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    // Populate property panel
    document.getElementById('panelPropertyImage').src = property.image;
    document.getElementById('panelPropertyTitle').textContent = property.title;
    document.getElementById('panelPropertyLocation').textContent = property.location;

    // Mock property details
    const detailsGrid = document.getElementById('propertyDetailsGrid');
    detailsGrid.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Price per Night</div>
            <div class="detail-value">Ksh ${property.price.toLocaleString()}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Rating</div>
            <div class="detail-value">⭐ ${property.rating}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Status</div>
            <div class="detail-value">${property.status.charAt(0).toUpperCase() +
property.status.slice(1)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Host</div>
            <div class="detail-value">${property.host}</div>
        </div>
    `;

    // Mock amenities
    const amenitiesGrid = document.getElementById('propertyAmenities');
    const mockAmenities = ['WiFi', 'Pool', 'Kitchen', 'Parking', 'Air Conditioning'];
    amenitiesGrid.innerHTML = mockAmenities.map(amenity => `
        <div class="amenity-item">
            <span class="amenity-icon">✓</span>
            ${amenity}
        </div>
    `).join('');

    // Switch to details tab
    document.querySelectorAll('#propertyPanel .panel-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('#propertyPanel .panel-tab[data-tab="details"]').classList.add('active');
    document.querySelectorAll('#propertyPanel .tab-content').forEach(content =>
content.classList.add('hidden'));
    document.getElementById('propertyDetailsTab').classList.remove('hidden');

    document.getElementById('propertyPanel').classList.add('open');
}

function editProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    // Populate edit form
    document.getElementById('editPropertyTitle').value = property.title;
    document.getElementById('editPropertyDescription').value = 'Mock description';
    document.getElementById('editPropertyLocation').value = property.location;
    document.getElementById('editPropertyPrice').value = property.price;
    document.getElementById('editPropertyType').value = 'villa';
    document.getElementById('editPropertyBedrooms').value = 3;
    document.getElementById('editPropertyBathrooms').value = 2;
    document.getElementById('editPropertyMaxGuests').value = 6;
    document.getElementById('editPropertyStatus').value = property.status;

    // Switch to edit tab
    document.querySelectorAll('#propertyPanel .panel-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('#propertyPanel .panel-tab[data-tab="edit"]').classList.add('active');
    document.querySelectorAll('#propertyPanel .tab-content').forEach(content =>
content.classList.add('hidden'));
    document.getElementById('propertyEditTab').classList.remove('hidden');

    document.getElementById('propertyPanel').classList.add('open');
}

async function loadProperties() {
    try {
        const response = await api.getAllProperties();
        properties = response.data || response || [];
        renderPropertiesTable(properties);
    } catch (error) {
        properties = [];
        renderPropertiesTable(properties);
    }
}

async function approveProperty(propertyId) {
    try {
        await api.updateProperty(propertyId, { status: 'active' });
        alert('Property approved successfully!');
        // Refresh the properties list
        loadProperties();
    } catch (error) {
        alert('Failed to approve property. Please try again.');
    }
}

function rejectProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
        property.status = 'rejected';
        renderPropertiesTable(properties);
        alert('Property rejected!');
    }
}

function suspendProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
        property.status = 'suspended';
        renderPropertiesTable(properties);
        alert('Property suspended!');
    }
}

async function deleteProperty(propertyId) {
    if (confirm('Are you sure you want to permanently delete this property? This action cannot be undone.')) {
        try {
            await api.deleteProperty(propertyId);
            alert('Property permanently deleted!');

            // Refresh the properties list to reflect the deletion
            await initializePropertiesManagement();
        } catch (error) {
            alert('Failed to delete property. Please try again.');
        }
    }
}
