// script.js — utility stub (ported to Replit static serving)
// Provides common utilities referenced by welcome.html and host-login.html.

(function () {
  'use strict';

  // Toast notification helper (no-op if not already defined)
  if (typeof window !== 'undefined' && !window.showToast) {
    window.showToast = function (message, type) {
      type = type || 'info';
      console.log('[Toast ' + type + ']:', message);
    };
  }

  // Smooth scroll helper
  if (typeof window !== 'undefined') {
    window.smoothScrollTo = function (targetId) {
      var el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
  }
})();
