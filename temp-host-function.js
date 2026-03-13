function populateHostTable(hosts) {
    const tableContainer = document.getElementById('hostTable');
    if (!tableContainer) return;

    // Clear existing rows except header
    const existingRows = tableContainer.querySelectorAll('.table-row');
    existingRows.forEach(row => row.remove());

    hosts.forEach(host => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div><img src="https://i.pravatar.cc/60?u=${host.email}" alt="${host.name}" class="host-avatar"></div>
            <div>
                <div class="host-name">${host.name}</div>
                <div class="host-email">${host.email}</div>
            </div>
            <div class="host-phone">${host.phone}</div>
            <div class="host-properties">${host.properties}</div>
        <div class="host-revenue">Ksh ${(host.totalEarnings || 0).toLocaleString()}</div>
            <div class="host-status"><span class="status-${host.status}">${host.status.charAt(0).toUpperCase() + host.status.slice(1)}</span></div>
            <div class="action-buttons">
                <button class="btn-view-profile" onclick="viewHostDetails('${host.id}')">View Profile</button>
                <button class="btn-view-properties" onclick="viewHostProperties('${host.id}')">View Properties</button>
                <button class="btn-edit" onclick="editHost('${host.id}')">Edit</button>
                <button class="btn-remove" onclick="removeHost('${host.id}')">Remove</button>
            </div>
        `;
        tableContainer.appendChild(row);
    });
}
