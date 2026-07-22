/**
 * Admin Host Invitation System
 * Designed to be included in admin-dashboard.html
 * Provides functionality to invite new hosts via Email and WhatsApp
 */

(function() {
    // 1. Inject CSS for the Modal
    const style = document.createElement('style');
    style.textContent = `
        .invite-modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s;
        }
        .invite-modal-content {
            background-color: #fff;
            margin: auto;
            padding: 30px;
            border-radius: 12px;
            width: 90%;
            max-width: 450px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            position: relative;
            animation: slideUp 0.3s;
        }
        .invite-modal h2 {
            margin-top: 0;
            color: #333;
            font-family: 'Playfair Display', serif;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .invite-group { margin-bottom: 15px; }
        .invite-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
        .invite-group input { 
            width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; 
            box-sizing: border-box; font-size: 14px;
        }
        .invite-group input:focus { border-color: #CC9AA1; outline: none; }
        .invite-actions { display: flex; gap: 10px; margin-top: 20px; }
        .invite-btn {
            flex: 1; padding: 10px; border: none; border-radius: 6px; cursor: pointer;
            color: white; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 5px;
            transition: opacity 0.2s;
        }
        .invite-btn:hover { opacity: 0.9; }
        .btn-email { background-color: #CC9AA1; }
        .btn-whatsapp { background-color: #25D366; }
        .btn-copy { background-color: #333; width: 40px; flex: none; }
        .close-invite { position: absolute; right: 20px; top: 20px; font-size: 24px; cursor: pointer; color: #999; }
        .link-display { background: #f9f9f9; padding: 10px; border-radius: 6px; margin-bottom: 15px; display: none; border: 1px dashed #ccc;}
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);

    // 2. Inject Modal HTML
    const modalHtml = `
        <div id="adminInviteHostModal" class="invite-modal">
            <div class="invite-modal-content">
                <span class="close-invite" onclick="window.closeInviteHostModal()">&times;</span>
                <h2>Invite New Host</h2>
                
                <div class="invite-group">
                    <label>Host Full Name</label>
                    <input type="text" id="invName" placeholder="Enter name">
                </div>
                <div class="invite-group">
                    <label>Email Address</label>
                    <input type="email" id="invEmail" placeholder="host@example.com">
                </div>
                <div class="invite-group">
                    <label>WhatsApp Number</label>
                    <input type="tel" id="invPhone" placeholder="+254...">
                </div>

                <div id="invLinkArea" class="link-display">
                    <label style="font-size:11px; text-transform:uppercase; color:#888;">Invitation Link</label>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <input type="text" id="invLinkResult" readonly style="background:#fff;">
                        <button class="invite-btn btn-copy" onclick="window.copyInvLink()"><i class="fas fa-copy"></i></button>
                    </div>
                </div>

                <div class="invite-actions">
                    <button class="invite-btn btn-email" onclick="window.sendHostInvite('email')"><i class="fas fa-envelope"></i> Email</button>
                    <button class="invite-btn btn-whatsapp" onclick="window.sendHostInvite('whatsapp')"><i class="fab fa-whatsapp"></i> WhatsApp</button>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    // 3. Define Logic
    window.openInviteHostModal = function() {
        document.getElementById('adminInviteHostModal').style.display = 'flex';
        document.getElementById('invLinkArea').style.display = 'none';
    };

    window.closeInviteHostModal = function() {
        document.getElementById('adminInviteHostModal').style.display = 'none';
    };

    window.copyInvLink = function() {
        const copyText = document.getElementById("invLinkResult");
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(copyText.value);
        alert("Link copied!");
    };

    window.sendHostInvite = function(method) {
        const name = document.getElementById('invName').value.trim();
        const email = document.getElementById('invEmail').value.trim();
        const phone = document.getElementById('invPhone').value.trim();

        if (!name) return alert('Please enter a name');
        if (method === 'email' && !email) return alert('Please enter an email');

        // Generate Link
        const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        const token = 'host_' + Date.now().toString(36);
        const link = `${baseUrl}host-signup.html?invite=${token}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
        
        document.getElementById('invLinkResult').value = link;
        document.getElementById('invLinkArea').style.display = 'block';

        const msg = `Hi ${name},\n\nYou're invited to join ViewOnce Airbnb Stays as a Host!\n\nGet started here:\n${link}`;
        
        if (method === 'email') window.location.href = `mailto:${email}?subject=Host Invitation&body=${encodeURIComponent(msg)}`;
        if (method === 'whatsapp') window.open(`https://wa.me/${phone.replace(/[^\d]/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
    };
})();