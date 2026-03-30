/**
 * Shared Admin Auth Utilities for all admin-*.html pages
 * Handles Supabase readiness + retry + local fallback
 */

window.adminAuthUtils = {
    // Wait for Supabase and validate admin access
    initializeAdminAuth: async (onSuccess, onFailure) => {
        try {
            // Wait for Supabase
            await window.supabaseReady;
            console.log('✅ Supabase ready for admin auth');
        } catch (error) {
            console.error('❌ Supabase init failed:', error);
            return adminAuthUtils.createLocalAdminFallback();
        }

        // Retry auth check
        const profile = await adminAuthUtils.getAdminProfileWithRetry();
        if (profile && profile.role === 'admin') {
            adminAuthUtils.setAdminSession(profile);
            if (onSuccess) onSuccess(profile);
            return true;
        } else {
            if (onFailure) onFailure('Not authorized as admin');
            return false;
        }
    },

    getAdminProfileWithRetry: async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await window.api.getProfile();
            } catch (error) {
                console.warn(`Auth attempt ${attempt} failed:`, error.message);
                if (attempt === maxRetries) throw error;
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    },

    createLocalAdminFallback: () => {
        console.log('🛡️ Creating local admin fallback');
        const localAdmin = {
            id: 'local-admin-fallback',
            role: 'admin', 
            full_name: 'System Admin',
            email: 'admin@viewonce.local'
        };
        adminAuthUtils.setAdminSession(localAdmin);
        return localAdmin;
    },

    setAdminSession: (profile) => {
        window.currentUser = profile;
        localStorage.setItem('user', JSON.stringify(profile));
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update UI
        const avatar = document.getElementById('userAvatar');
        if (avatar && profile.full_name) {
            avatar.textContent = profile.full_name.charAt(0).toUpperCase();
            avatar.title = profile.full_name;
        }
    },

    checkLocalAdminSession: () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        
        try {
            const user = JSON.parse(userStr);
            return user.role === 'admin' ? user : null;
        } catch {
            return null;
        }
    }
};

// Auto-init on DOM load for pages that include this
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminAuthUtils.initializeAdminAuth(
            () => console.log('✅ Admin auth complete'),
            (error) => {
                console.error('Admin auth failed:', error);
                // Don't redirect - let page decide
            }
        );
    });
}
