```javascript
// Admin & Host Dashboard Sidebar Fix - ENHANCED VERSION
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

  // 1. Fallback for navigateTo if it's missing or broken in admin-functions.js
  // This fixes Step 3 & 4 in TODO.md (Selector mismatch & Page ID handling)
  if (typeof window.navigateTo !== 'function') {
    console.warn('⚠️ navigateTo function not found. Defining robust fallback.');
    
    window.navigateTo = function(pageId, element) {
      console.log(`Navigate to: ${pageId}`);
      
      // Update UI - Active State
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
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.error(`❌ Target page not found for: ${pageId}. Checked IDs: ${targetIds.join(', ')}`);
        // Fallback: show dashboard if target not found
        const dashboard = document.getElementById('dashboard');
        if (dashboard) dashboard.style.display = 'block';
      }
    };
  }

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
        window.navigateTo(page, this);
        
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
