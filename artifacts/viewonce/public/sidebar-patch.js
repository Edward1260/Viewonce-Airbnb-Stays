/**
 * Sidebar Initialization Patch
 * Fixes the "initializeSidebar is not defined" error
 */

// Flag to prevent double initialization
let isSidebarInitialized = false;

function initializeSidebar() {
    // Prevent multiple initializations which could cause button to toggle twice
    if (isSidebarInitialized) {
        console.log('Sidebar already initialized, skipping initializeSidebar call.');
        return;
    }

    console.log('initializeSidebar called');

    // Check if the modern setup function exists and delegate to it
    if (typeof setupSidebarToggle === 'function') {
        console.log('Delegating to setupSidebarToggle');
        setupSidebarToggle();
        isSidebarInitialized = true;
    } else {
        // This function is a placeholder to prevent ReferenceError.
        // The actual sidebar logic is handled by setupSidebarToggle() in admin-dashboard.html
        console.warn('setupSidebarToggle not found. Sidebar might not be initialized yet.');
    }
}

// Ensure the function is globally available
window.initializeSidebar = initializeSidebar;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure other scripts are loaded
        setTimeout(initializeSidebar, 50);
    });
} else {
    // If loaded dynamically or after DOMContentLoaded
    setTimeout(initializeSidebar, 50);
}
