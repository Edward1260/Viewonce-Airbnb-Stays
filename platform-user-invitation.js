// ==================== USER INVITATION SYSTEM ====================
// Add these functions to platform-master-hub-fixed.html

// Store for invitations
var sentInvitations = [];

/**
 * Sync invitations from the backend API
 */
async function syncInvitations() {
  try {
    const data = await window.api.getInvitations();
    sentInvitations = Array.isArray(data) ? data : (data.data || []);
  } catch (e) {
    console.error('Failed to sync invitations:', e);
  }
}

/**
 * Renders the categorized Invitation Center directly into the dashboard.
 */
async function renderInvitationCenter(containerId) {
  await syncInvitations();
  const container = document.getElementById(containerId);
  if (!container) return;

  const roles = [
    { id: 'admin', label: 'Administrators', icon: 'fa-user-shield', color: 'emerald' },
    { id: 'support', label: 'Support Team', icon: 'fa-headset', color: 'blue' },
    { id: 'host', label: 'Property Hosts', icon: 'fa-home', color: 'purple' },
    { id: 'platform_master', label: 'Platform Masters', icon: 'fa-crown', color: 'indigo' }
  ];

  let html = `
    <div class="invitation-center p-6">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-2xl font-bold">User Access & Invitations</h2>
        <button class="luxury-btn" onclick="openAddUserModal()">+ Quick Add User</button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${roles.map(role => `
          <div class="role-card glassmorphism p-5 border-t-4 border-${role.color}-500 rounded-xl shadow-lg">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-${role.color}-100 flex items-center justify-center text-${role.color}-600">
                <i class="fas ${role.icon}"></i>
              </div>
              <h3 class="text-lg font-bold">${role.label}</h3>
            </div>
            
            <div class="space-y-4">
              <p class="text-sm text-gray-400">Invite new ${role.id}s to manage the platform.</p>
              <button onclick="openCategorizedInviteModal('${role.id}')" 
                      class="w-full py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all text-sm font-semibold">
                Generate ${role.id} Link
              </button>
              
              <div class="mt-4 pt-4 border-t border-white/10">
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Recent ${role.label}</h4>
                <div id="recent-${role.id}-invites" class="space-y-2 max-height-40 overflow-y-auto">
                  ${renderRoleSpecificInvites(role.id)}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Opens the invitation modal pre-configured for a specific role.
 */
async function openCategorizedInviteModal(role) {
  await openInviteUserModal();
  // Slight delay to ensure DOM is ready
  setTimeout(() => {
    const roleSelect = document.getElementById('inviteRole');
    if (roleSelect) {
      roleSelect.value = role;
    }
  }, 50);
}

/**
 * Renders recent invitations filtered by role.
 */
function renderRoleSpecificInvites(role) {
  const roleInvites = sentInvitations.filter(inv => inv.role === role).slice(0, 3);
  if (roleInvites.length === 0) {
    return '<p class="text-xs text-gray-500 italic">No recent invites</p>';
  }
  
  return roleInvites.map(inv => `
    <div class="flex justify-between items-center text-xs p-2 bg-black/20 rounded">
      <div class="truncate mr-2">
        <div class="font-bold">${inv.email}</div>
        <div class="text-gray-500">${inv.date}</div>
      </div>
      <span class="px-1.5 py-0.5 rounded ${inv.status === 'sent' ? 'bg-blue-900/40 text-blue-400' : 'bg-green-900/40 text-green-400'}">
        ${inv.status}
      </span>
    </div>
  `).join('');
}

// Open Add User Modal
function openAddUserModal() {
  var modal = document.getElementById('modal');
  var title = document.getElementById('modalTitle');
  var content = document.getElementById('modalText');
  
  title.innerText = '➕ Add New User';
  content.innerHTML = `
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Full Name *</label>
      <input type="text" id="newUserName" placeholder="Enter full name" required>
    </div>
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Email Address *</label>
      <input type="email" id="newUserEmail" placeholder="Enter email address" required>
    </div>
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Phone Number</label>
      <input type="tel" id="newUserPhone" placeholder="e.g., 254712345678">
    </div>
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Role *</label>
      <select id="newUserRole">
        <option value="customer">Customer</option>
        <option value="host">Host</option>
        <option value="support">Support</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Send Invitation</label>
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="sendInvitation" checked> Send invitation email to user
      </label>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="luxury-btn" onclick="addNewUser()">➕ Add User</button>
      <button class="luxury-btn" onclick="closeModal()" style="background:rgba(255,255,255,0.1)">Cancel</button>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// Add New User
async function addNewUser() {
  var name = document.getElementById('newUserName').value.trim();
  var email = document.getElementById('newUserEmail').value.trim();
  var phone = document.getElementById('newUserPhone').value.trim();
  var role = document.getElementById('newUserRole').value;
  var sendInvite = document.getElementById('sendInvitation').checked;
  
  if (!name || !email) {
    alert('Please fill in all required fields (Name and Email)');
    return;
  }
  
  // Validate email
  if (!email.includes('@')) {
    alert('Please enter a valid email address');
    return;
  }
  
  try {
    // Create user object
    var newUser = {
      id: 'user_' + Date.now(),
      name: name,
      email: email,
      phone: phone,
      role: role,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    // Try to save to API if available
    try {
      await api.createUser(newUser);
    } catch(e) {
      console.log('API not available, saving to local storage');
      // Save to local storage as fallback
      var users = JSON.parse(localStorage.getItem('platform_users') || '[]');
      users.push(newUser);
      localStorage.setItem('platform_users', JSON.stringify(users));
    }
    
    alert('✅ User "' + name + '" has been added successfully!');
    
    if (sendInvite) {
      // Send invitation
      sendUserInvitation(newUser);
    }
    
    closeModal();
    loadUsersData(); // Refresh the users table
    
  } catch(e) {
    console.error('Error adding user:', e);
    alert('Error adding user: ' + e.message);
  }
}

// Open Invite User Modal
async function openInviteUserModal() {
  await syncInvitations();
  var modal = document.getElementById('modal');
  var title = document.getElementById('modalTitle');
  var content = document.getElementById('modalText');
  
  title.innerText = '📧 Send Access Invitation';
  content.innerHTML = `
    <div style="margin-bottom:20px">
      <p style="color:var(--muted);margin-bottom:15px">Send invitation links to new users to join the platform.</p>
    </div>
    
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Invitee Email *</label>
      <input type="email" id="inviteEmail" placeholder="Enter email address">
    </div>
    
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Invitee Name</label>
      <input type="text" id="inviteName" placeholder="Enter name (optional)">
    </div>
    
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Dashboard Type *</label>
      <select id="inviteRole">
        <option value="platform_master">Platform Master Hub</option>
        <option value="admin">Admin Dashboard</option>
        <option value="host">Host Dashboard</option>
        <option value="support">Support Dashboard</option>
        <option value="customer" selected>Customer Dashboard</option>
      </select>
    </div>
    
    <div style="margin-bottom:15px">
      <label style="margin-bottom:5px;display:block">Custom Message</label>
      <textarea id="inviteMessage" rows="3" placeholder="Add a personal message (optional)"></textarea>
    </div>
    
    <div style="margin-bottom:20px">
      <label style="margin-bottom:10px;display:block">Send Via:</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="luxury-btn" onclick="sendInvitationLink('email')">📧 Email</button>
        <button class="luxury-btn" onclick="sendInvitationLink('sms')">📱 SMS</button>
        <button class="luxury-btn" onclick="sendInvitationLink('whatsapp')">💬 WhatsApp</button>
      </div>
    </div>
    
    <div style="margin-top:20px">
      <h4 style="margin-bottom:10px">Recent Invitations</h4>
      <div id="invitationsList" style="max-height:200px;overflow-y:auto">
        ${renderInvitationsList()}
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// Render Invitations List
function renderInvitationsList() {
  if (sentInvitations.length === 0) {
    return '<p style="color:var(--muted)">No invitations sent yet.</p>';
  }
  
  return sentInvitations.slice(0, 5).map(function(inv) {
    return '<div class="alert" style="margin-bottom:5px;padding:10px"><strong>' + inv.email + '</strong><br><small>' + inv.role + ' | ' + inv.date + '</small></div>';
  }).join('');
}

// Send Invitation Link
async function sendInvitationLink(method) {
  var email = document.getElementById('inviteEmail').value.trim();
  var name = document.getElementById('inviteName').value.trim();
  var role = document.getElementById('inviteRole').value;
  var message = document.getElementById('inviteMessage').value.trim();
  
  if (!email) {
    alert('Please enter an email address');
    return;
  }
  
  let invitationLink = '';
  let inviteToken = '';

  try {
    // 1. Call the Backend API to create the invitation
    const result = await window.api.createInvitation({
      email,
      name,
      role,
      message
    });

    inviteToken = result.token;
    invitationLink = result.link || (window.location.origin + '/auth.html?form=signup&role=' + role + '&token=' + inviteToken + '&email=' + encodeURIComponent(email));
  } catch (e) {
    console.error('API Invitation Error:', e);
    alert('Backend connection failed. Generating local token instead.');
    inviteToken = 'local_' + Date.now();
    invitationLink = window.location.origin + '/auth.html?form=signup&role=' + role + '&token=' + inviteToken + '&email=' + encodeURIComponent(email);
  }

  var defaultMessage = name ? 'Hi ' + name + ',' : 'Hi,';
  defaultMessage += '\n\nYou have been invited to join ViewOnce Airbnb Stays as a ' + role + '.';
  defaultMessage += '\n\nClick the link below to get started:\n' + invitationLink;
  if (message) {
    defaultMessage += '\n\nPersonal message: ' + message;
  }
  defaultMessage += '\n\nBest regards,\nViewOnce Team';

  var subject = 'Invitation to join ViewOnce Airbnb Stays';
  
  // Send based on method
  if (method === 'email') {
    // Open email client
    var mailtoLink = 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(defaultMessage);
    window.open(mailtoLink);
    alert('📧 Email client opened! The invitation link has been added to the email body.');
  } 
  else if (method === 'sms') {
    var phone = document.getElementById('newUserPhone') ? document.getElementById('newUserPhone').value : '';
    if (phone) {
      var smsLink = 'sms:' + phone + '?body=' + encodeURIComponent(defaultMessage);
      window.open(smsLink);
      alert('📱 SMS app opened!');
    } else {
      alert('Please enter a phone number in the phone field to send SMS');
      return;
    }
  }
  else if (method === 'whatsapp') {
    var whatsappUrl = 'https://wa.me/' + (email.includes('@') ? '' : email) + '?text=' + encodeURIComponent(defaultMessage);
    window.open(whatsappUrl, '_blank');
    alert('💬 WhatsApp opened! Send the invitation link to your user.');
  }
  
  // Save invitation record
  var invitation = {
    id: inviteToken,
    email: email,
    name: name,
    role: role,
    message: message,
    link: invitationLink,
    method: method,
    date: new Date().toLocaleString(),
    status: 'sent'
  };
  sentInvitations.unshift(invitation);
  
  // Save to local storage
  localStorage.setItem('sentInvitations', JSON.stringify(sentInvitations));
  
  // Refresh categorized UI if it exists on the page
  if (document.querySelector('.invitation-center')) {
    renderInvitationCenter('invitation-center-container'); 
  }

  // Refresh the list
  document.getElementById('invitationsList').innerHTML = renderInvitationsList();
  
  logSecurityEvent('Invitation sent', {email: email, role: role, method: method});
}

// Send User Invitation (for newly created users)
function sendUserInvitation(user) {
  var email = user.email;
  var name = user.name;
  var role = user.role;
  
  // Generate link
  var baseUrl = window.location.origin + window.location.pathname.replace(/[^/]+$/, '');
  var inviteToken = 'invite_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Use Clean Secure Routes for invitations
  var targetRoute = '';
  if (role === 'platform_master' || role === 'platform_master_hub' || role === 'super_admin') {
      targetRoute = '/platform-master-hub';
  } else if (role === 'admin') {
      targetRoute = '/dashboard';
  } else if (role === 'host') {
      targetRoute = '/host-dashboard';
  } else if (role === 'support') {
      targetRoute = '/support-dashboard';
  } else {
      targetRoute = '/customer-dashboard';
  }
  
  var invitationLink = window.location.origin + targetRoute + '?invite=' + inviteToken;
  
  var message = 'Hi ' + name + ',\n\nWelcome to ViewOnce Airbnb Stays! You have been added as a ' + role + '.\n\nClick here to access your dashboard: ' + invitationLink + '\n\nBest regards,\nViewOnce Team';
  
  // Open email client
  var mailtoLink = 'mailto:' + email + '?subject=' + encodeURIComponent('Welcome to ViewOnce Airbnb Stays') + '&body=' + encodeURIComponent(message);
  window.open(mailtoLink);
}

// Export Users
function exportUsers() {
  var users = [];
  try {
    users = JSON.parse(localStorage.getItem('platform_users') || '[]');
  } catch(e) {
    console.log('No users in local storage');
  }
  
  if (users.length === 0) {
    alert('No users to export. Users will be loaded from the database.');
    return;
  }
  
  // Create CSV content
  var csv = 'Name,Email,Role,Active,Created\n';
  users.forEach(function(u) {
    csv += '"' + (u.name || '') + '","' + (u.email || '') + '","' + (u.role || '') + '","' + (u.isActive ? 'Yes' : 'No') + '","' + (u.createdAt || '') + '"\n';
  });
  
  // Download file
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'users_export_' + Date.now() + '.csv';
  a.click();
  
  alert('📤 Users exported successfully!');
}

// Load saved invitations on startup
if (localStorage.getItem('sentInvitations')) {
  try {
    sentInvitations = JSON.parse(localStorage.getItem('sentInvitations'));
  } catch(e) {
    sentInvitations = [];
  }
}
