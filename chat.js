// Chat System for Host Communication - Backend Integrated
class ChatSystem {
    constructor() {
        this.currentConversationId = null;
        // Point to the versioned API path used by the backend
        this.apiBaseUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost:3001/api/v1' 
            : window.location.origin + '/api/v1';
        this.token = localStorage.getItem('token');
    }

    // Get auth headers
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    // Send message to backend
    async sendMessage(conversationId, content) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/messages`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    conversationId,
                    senderId: 'user', // Will be overridden by backend from JWT
                    content
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Get conversation history
    async getConversationHistory(conversationId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/messages/${conversationId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    // Start new conversation
    startConversation(hostId, propertyId) {
        this.currentConversationId = `${hostId}_${propertyId}_${Date.now()}`;
        return this.currentConversationId;
    }

    // Set current conversation
    setCurrentConversation(conversationId) {
        this.currentConversationId = conversationId;
    }

    // Get current conversation
    getCurrentConversation() {
        return this.currentConversationId;
    }

    /**
     * Unified Communication Hub UI
     * Renders a tabbed interface for both direct messages and support tickets
     */
    renderCommunicationHub(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="comm-hub-wrapper glassmorphism">
                <div class="comm-hub-tabs">
                    <button class="hub-tab active" data-tab="messages">💬 Direct Messages</button>
                    <button class="hub-tab" data-tab="support">🛠️ Support Tickets</button>
                </div>
                <div class="hub-content" id="hub-content-area">
                    <div class="loading-state">Initializing communication channels...</div>
                </div>
            </div>
            <style>
                .comm-hub-wrapper { display: flex; flex-direction: column; height: 600px; border-radius: 20px; overflow: hidden; }
                .comm-hub-tabs { display: flex; background: rgba(0,0,0,0.2); padding: 10px; gap: 10px; }
                .hub-tab { padding: 10px 20px; border: none; background: transparent; color: white; cursor: pointer; border-radius: 8px; transition: 0.3s; }
                .hub-tab.active { background: #CC9AA1; font-weight: bold; }
                .hub-content { flex-grow: 1; padding: 20px; overflow-y: auto; background: rgba(255,255,255,0.02); }
                .conversation-item { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
                .conversation-item:hover { background: rgba(255,255,255,0.05); }
            </style>
        `;

        // Setup tab listeners
        container.querySelectorAll('.hub-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                container.querySelectorAll('.hub-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.loadHubData(e.target.dataset.tab);
            });
        });

        // Default load
        this.loadHubData('messages');
    }

    /**
     * Load and render data for the specified hub tab (DMs or Support)
     */
    async loadHubData(type) {
        const contentArea = document.getElementById('hub-content-area');
        if (!contentArea) return;

        contentArea.innerHTML = '<div class="loading">Loading Intelligence...</div>';

        try {
            if (type === 'messages') {
                const response = await fetch(`${this.apiBaseUrl}/chat/conversations`, {
                    headers: this.getHeaders()
                });
                const conversations = await response.json();
                this.renderConversations(conversations);
            } else if (type === 'support') {
                const response = await fetch(`${this.apiBaseUrl}/support/tickets`, {
                    headers: this.getHeaders()
                });
                const tickets = await response.json();
                this.renderSupportTickets(tickets);
            }
        } catch (error) {
            contentArea.innerHTML = `<div class="alert error">Failed to load channels: ${error.message}</div>`;
        }
    }

    renderConversations(conversations) {
        const contentArea = document.getElementById('hub-content-area');
        if (!conversations || !conversations.length) {
            contentArea.innerHTML = '<div class="empty-state">No active direct messages.</div>';
            return;
        }
        contentArea.innerHTML = conversations.map(c => `
            <div class="conversation-item" onclick="chatSystem.setCurrentConversation('${c.id}')">
                <div class="conv-header"><strong>${c.participantName || 'Guest'}</strong></div>
                <div class="conv-preview text-muted">${c.lastMessage || 'Start a conversation...'}</div>
            </div>
        `).join('');
    }

    renderSupportTickets(tickets) {
        const contentArea = document.getElementById('hub-content-area');
        if (!tickets || !tickets.length) {
            contentArea.innerHTML = '<div class="empty-state">No support history found.</div>';
            return;
        }
        contentArea.innerHTML = tickets.map(t => `
            <div class="conversation-item" onclick="window.location.href='/support-ticket.html?id=${t.id}'">
                <div class="conv-header"><strong>Ticket #${t.id.substring(0, 8)}</strong> - <span class="status-${t.status}">${t.status}</span></div>
                <div class="conv-preview">${t.subject || 'General Inquiry'}</div>
            </div>
        `).join('');
    }
}

// Create global chat system instance
const chatSystem = new ChatSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = chatSystem;
}
