// Payout Management Functions
let payouts = [];
let filteredPayouts = [];
let currentPayout = null;

async function initializePayoutsManagement() {
    try {
        const response = await api.getPayouts();
        payouts = response.data || response || [];
        filteredPayouts = [...payouts];
        renderPayoutsTable();
        setupPayoutEventListeners();

    } catch (error) {
        console.error('Failed to load payouts:', error);
        payouts = [];
        renderPayoutsTable();
    }
}

function setupPayoutEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('payoutSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            if (query.length > 0) {
                filteredPayouts = payouts.filter(payout =>
                    payout.host?.firstName?.toLowerCase().includes(query) ||
                    payout.host?.lastName?.toLowerCase().includes(query) ||
                    payout.host?.email?.toLowerCase().includes(query) ||
                    payout.booking?.id?.toLowerCase().includes(query) ||
                    payout.amount?.toString().includes(query)
                );
            } else {
                filteredPayouts = [...payouts];
            }
            renderPayoutsTable();
        });
    }

    // Filter buttons
    const filterButtons = document.querySelectorAll('#payoutsManagementSection .filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            filterPayouts(filter);
        });
    });

    // Panel close
    const closePanelBtn = document.getElementById('closePayoutPanel');
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', closePayoutPanel);
    }

    // Tab switching
    const panelTabs = document.querySelectorAll('#payoutPanel .panel-tab');
    panelTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchPayoutTab(tabName);
        });
    });
}

function filterPayouts(status) {
    if (status === 'all') {
        filteredPayouts = [...payouts];
    } else {
        filteredPayouts = payouts.filter(payout => payout.status === status);
    }
    renderPayoutsTable();
}

function renderPayoutsTable() {
    const tableContainer = document.getElementById('payoutsTable');
    if (!tableContainer) return;

    // Clear existing rows except header
    const existingRows = tableContainer.querySelectorAll('.table-row');
    existingRows.forEach(row => row.remove());

    filteredPayouts.forEach(payout => {
        const hostName = payout.host ? `${payout.host.firstName} ${payout.host.lastName}` : 'Unknown Host';
        const bookingId = payout.booking?.id || 'N/A';

        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div class="payout-id">${payout.id.substring(0, 8)}...</div>
            <div class="payout-host">${hostName}</div>
            <div class="payout-booking">${bookingId}</div>
            <div class="payout-amount">Ksh ${payout.amount?.toLocaleString() || '0'}</div>
            <div class="payout-commission">Ksh ${payout.commission?.toLocaleString() || '0'}</div>
            <div class="payout-net">Ksh ${payout.netAmount?.toLocaleString() || '0'}</div>
            <div><span class="payout-status status-${payout.status}">${payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}</span></div>
            <div class="action-buttons">
                <button class="btn-view" onclick="viewPayoutDetails('${payout.id}')">View</button>
                ${payout.status === 'pending' ? `<button class="btn-approve" onclick="approvePayout('${payout.id}')">Approve</button>` : ''}
                ${payout.status === 'approved' ? `<button class="btn-complete" onclick="completePayout('${payout.id}')">Complete</button>` : ''}
                ${payout.status !== 'completed' && payout.status !== 'cancelled' ? `<button class="btn-cancel" onclick="cancelPayout('${payout.id}')">Cancel</button>` : ''}
                ${payout.status !== 'completed' && payout.status !== 'cancelled' ? `<button class="btn-dispute" onclick="disputePayout('${payout.id}')">Dispute</button>` : ''}
            </div>
        `;
        tableContainer.appendChild(row);
    });
}

async function viewPayoutDetails(payoutId) {
    try {
        const response = await api.getPayout(payoutId);
        const payout = response.data || response;
        if (!payout) return;

        currentPayout = payout;

        // Update panel header
        document.getElementById('payoutPanelTitle').textContent = `Payout ${payout.id.substring(0, 8)}...`;
        document.getElementById('payoutPanelInfo').textContent = `${payout.host?.firstName} ${payout.host?.lastName} - Ksh ${payout.netAmount?.toLocaleString()}`;

        // Update details tab
        const detailsGrid = document.getElementById('payoutDetailsGrid');
        if (detailsGrid) {
            detailsGrid.innerHTML = `
                <div class="detail-item">
                    <div class="detail-label">Host Name</div>
                    <div class="detail-value">${payout.host?.firstName} ${payout.host?.lastName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Host Email</div>
                    <div class="detail-value">${payout.host?.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Booking ID</div>
                    <div class="detail-value">${payout.booking?.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Property</div>
                    <div class="detail-value">${payout.booking?.property?.title || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Amount</div>
                    <div class="detail-value">Ksh ${payout.amount?.toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Commission (10%)</div>
                    <div class="detail-value">Ksh ${payout.commission?.toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Net Amount</div>
                    <div class="detail-value">Ksh ${payout.netAmount?.toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Created</div>
                    <div class="detail-value">${new Date(payout.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Processed</div>
                    <div class="detail-value">${payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : 'Not processed'}</div>
                </div>
            `;
        }

        // Update notes tab
        const notesTextarea = document.getElementById('payoutAdminNotes');
        if (notesTextarea) {
            notesTextarea.value = payout.adminNotes || '';
        }

        // Show panel
        const panel = document.getElementById('payoutPanel');
        if (panel) {
            panel.classList.add('open');
        }

        // Switch to details tab by default
        switchPayoutTab('details');
    } catch (error) {
        console.error('Failed to load payout details:', error);
        alert('Failed to load payout details');
    }
}

function closePayoutPanel() {
    const panel = document.getElementById('payoutPanel');
    if (panel) {
        panel.classList.remove('open');
    }
    currentPayout = null;
}

function switchPayoutTab(tabName) {
    const tabs = document.querySelectorAll('#payoutPanel .panel-tab');
    const contents = document.querySelectorAll('#payoutPanel .tab-content');

    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.add('hidden'));

    const activeTab = document.querySelector(`#payoutPanel [data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`payout${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);

    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.remove('hidden');
}

async function approvePayout(payoutId) {
    if (!confirm('Are you sure you want to approve this payout?')) return;

    try {
        await api.approvePayout(payoutId);
        alert('Payout approved successfully!');
        await initializePayoutsManagement(); // Refresh data
        closePayoutPanel();
    } catch (error) {
        console.error('Failed to approve payout:', error);
        alert('Failed to approve payout');
    }
}

async function completePayout(payoutId) {
    if (!confirm('Are you sure you want to complete this payout? This will transfer funds to the host.')) return;

    try {
        await api.completePayout(payoutId);
        alert('Payout completed successfully! Funds have been transferred to the host.');
        await initializePayoutsManagement(); // Refresh data
        closePayoutPanel();
    } catch (error) {
        console.error('Failed to complete payout:', error);
        alert('Failed to complete payout');
    }
}

async function cancelPayout(payoutId) {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // User cancelled

    try {
        await api.cancelPayout(payoutId, reason);
        alert('Payout cancelled successfully!');
        await initializePayoutsManagement(); // Refresh data
        closePayoutPanel();
    } catch (error) {
        console.error('Failed to cancel payout:', error);
        alert('Failed to cancel payout');
    }
}

async function disputePayout(payoutId) {
    const reason = prompt('Reason for dispute (required):');
    if (!reason || reason.trim() === '') {
        alert('Dispute reason is required');
        return;
    }

    try {
        await api.disputePayout(payoutId, reason);
        alert('Payout disputed successfully!');
        await initializePayoutsManagement(); // Refresh data
        closePayoutPanel();
    } catch (error) {
        console.error('Failed to dispute payout:', error);
        alert('Failed to dispute payout');
    }
}

async function savePayoutNotes() {
    if (!currentPayout) return;

    const notes = document.getElementById('payoutAdminNotes').value;

    try {
        // Update payout with new notes
        await api.updatePayout(currentPayout.id, { adminNotes: notes });
        alert('Notes saved successfully!');
        currentPayout.adminNotes = notes;
    } catch (error) {
        console.error('Failed to save notes:', error);
        alert('Failed to save notes');
    }
}
