```javascript
// Admin & Host Dashboard Sidebar Fix - PRODUCTION VERSION
document.addEventListener('DOMContentLoaded', function() {
  console.log('🛠️ Sidebar Fix: Initializing sidebar navigation...');
  
  // Sidebar and Toggle Selectors
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn') || document.querySelector('[aria-label="Open sidebar"]');
  const closeBtn = document.getElementById('closeSidebar') || document.getElementById('closeBtn') || document.querySelector('.close-sidebar');

  // Define global closeSidebar helper for navigation
  window.closeSidebar = function() {
    if (sidebar && window.innerWidth <= 1024) {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
    }
  };

  // Setup mobile toggle listeners
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar?.classList.remove('-translate-x-full');
      sidebar?.classList.add('translate-x-0');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', window.closeSidebar);
  }

  // Function to inject a "Back to Dashboard" button for sub-pages
  function injectBackButton(container) {
    if (!container || container.id === 'dashboard' || container.id === 'dashboardPage') return;
    
    let backBtn = container.querySelector('.back-to-dashboard-btn');
    if (!backBtn) {
      backBtn = document.createElement('button');
      backBtn.className = 'back-to-dashboard-btn mb-4 flex items-center text-sm font-medium text-gray-500 hover:text-black transition-all transform hover:-translate-x-1';
      backBtn.innerHTML = '<i class="fas fa-arrow-left mr-2"></i> Back to Dashboard';
      backBtn.onclick = () => window.navigateTo('dashboard');
      container.insertBefore(backBtn, container.firstChild);
    }
  }

  // Clean up duplicate elements (addressed in TODO_admin_dashboard_fix.md)
  function cleanupDuplicates() {
    try {
      const sidebars = document.querySelectorAll('#sidebar');
      if (sidebars.length > 1) {
        for (let i = 1; i < sidebars.length; i++) sidebars[i].remove();
      }
    } catch (e) { console.warn('Cleanup skipped:', e); }
  }

  // 1. Fallback for navigateTo if it's missing or broken in admin-functions.js
  // This fixes Step 3 & 4 in TODO.md (Selector mismatch & Page ID handling)
  // We wrap this to ensure it doesn't conflict with global routers
  const initNavigation = () => {
    console.log('ℹ️ Navigation Engine: Initializing Admin SPA Navigation...');
    
    window.switchAdminPage = function(pageId, element) {
      console.log(`Navigate to: ${pageId}`);
      
      // Update UI - Sidebar Active State
      document.querySelectorAll('.sidebar-item').forEach(el => {
        // Remove active classes (Tailwind utility patterns)
        el.classList.remove('bg-white/10', 'border-l-4', 'border-white', 'font-semibold');
        el.classList.add('opacity-70', 'hover:opacity-100');
      });
      
      if (element) {
        element.classList.remove('opacity-70', 'hover:opacity-100');
        element.classList.add('bg-white/10', 'border-l-4', 'border-white', 'font-semibold');
      }

      // Hide all pages
      // Handles both .page and .page-content selectors (Step 3 fix)
      const pages = document.querySelectorAll('.page, .page-content, section[id$="Page"]');
      pages.forEach(p => p.style.display = 'none');
      
      // Show target page - Try common ID patterns (Step 4 fix)
      const targetIds = [pageId, `${pageId}Page`, `${pageId}-page`, `page-${pageId}`];
      let found = false;
      
      for (const id of targetIds) {
        const target = document.getElementById(id);
        if (target) {
          target.style.display = 'block';
          console.log(`✅ Showing page: #${id}`);
          
          // Automatically inject Back button and scroll to top
          injectBackButton(target);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.warn(`❌ Page [${pageId}] not found. Redirecting to Dashboard.`);
        // Fallback: show dashboard if target not found
        const dashboard = document.getElementById('dashboard');
        if (dashboard) dashboard.style.display = 'block';
      }

      // Update Main Header Title
      const headerTitle = document.querySelector('header h1, #mainPageTitle');
      if (headerTitle) {
        headerTitle.textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1).replace('-', ' ');
      }
    };

    // If router.js exists, we still want our local buttons to work. 
    // We map navigateTo to our internal switcher if we are on the admin dashboard.
    window.navigateTo = window.switchAdminPage;
  };

  // Safe Initializer with Catch Blocks (Fixing Step 1 in TODO_admin_dashboard_fix.md)
  async function safeInit(fnName) {
    if (typeof window[fnName] === 'function') {
      try {
        await windowfnName;
        console.log(`✅ ${fnName} initialized`);
      } catch (error) {
        console.error(`❌ ${fnName} failed:`, error);
      }
    }
  }

  // Run Cleanup and Feature Updates
  initNavigation();
  cleanupDuplicates();
  safeInit('initializePayoutsManagement');
  safeInit('loadAdminStats');
  safeInit('initActivityMap');

  // Add click handlers to ALL sidebar navigation items
  // Fixes Step 2 in TODO.md (Add onclick handlers)
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  
  sidebarItems.forEach((item, index) => {
    // If data-page is missing, infer it from text (e.g., "Hosts" -> "hosts")
    if (!item.getAttribute('data-page')) {
      const text = item.textContent.trim().toLowerCase();
      let inferredPage = text.split(' ')[0]; // Take first word
      // Map common terms to standard page IDs
      if (text.includes('dashboard')) inferredPage = 'dashboard';
      else if (text.includes('host')) inferredPage = 'hosts';
      else if (text.includes('customer')) inferredPage = 'customers';
      else if (text.includes('booking')) inferredPage = 'bookings';
      else if (text.includes('propert')) inferredPage = 'properties';
      else if (text.includes('payment')) inferredPage = 'payments';
      else if (text.includes('calendar')) inferredPage = 'calendar';
      else if (text.includes('analytic')) inferredPage = 'analytics';
      
      if (inferredPage) {
        item.setAttribute('data-page', inferredPage);
        console.log(`ℹ️ Inferred page '${inferredPage}' for item '${item.textContent.trim()}'`);
      }
    }

    // Remove any existing handlers to prevent duplicates
    if (item._sidebarHandler) item.removeEventListener('click', item._sidebarHandler);
    
    // Create new handler
    item._sidebarHandler = function(e) {
      if (this.tagName !== 'A') e.preventDefault(); // Only prevent default if not a direct link
      e.stopPropagation();
      
      const page = this.getAttribute('data-page');
      
      if (page) {
        window.switchAdminPage(page, this);
        
        // Close sidebar on mobile after navigation (better UX)
        if (window.innerWidth <= 1024) {
          if (typeof closeSidebar === 'function') {
            closeSidebar();
          }
        }
      }
    };
    
    // Attach the handler
    item.addEventListener('click', item._sidebarHandler);
    
    // Visual feedback
    item.style.cursor = 'pointer';
    item.title = `Navigate to ${item.textContent.trim()}`;
  });
  
  console.log('✅ Sidebar navigation handlers attached successfully');
  
  // Also handle any direct onclick buttons in sidebar
  document.querySelectorAll('.sidebar-item[onclick]').forEach(item => {
    console.log('🔗 Found direct onclick sidebar item:', item);
  });
});
