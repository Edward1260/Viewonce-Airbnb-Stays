// Chat System for Host Communication - Backend Integrated
class ChatSystem {
    constructor() {
        this.currentConversationId = null;
        this.apiBaseUrl = window.location.origin;
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
}

// Create global chat system instance
const chatSystem = new ChatSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = chatSystem;
}
