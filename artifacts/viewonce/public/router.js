// router.js — client-side routing stub (ported to Replit static serving)
// The original app used this for hash/pushState routing between HTML pages.
// In the Replit port, navigation is handled by direct <a href> links between
// static HTML files served by the Vite dev server / production static server.
// This stub ensures pages that include router.js load without errors.

(function () {
  'use strict';

  var Router = {
    routes: {},
    currentRoute: null,

    on: function (path, handler) {
      this.routes[path] = handler;
      return this;
    },

    navigate: function (path) {
      if (typeof path === 'string' && path.length > 0) {
        window.location.href = path;
      }
    },

    init: function () {
      // No-op: navigation is handled natively by the browser
      return this;
    },

    start: function () {
      return this;
    },
  };

  // navigateTo() helper: used by welcome.html and other pages for button navigation
  function navigateTo(path) {
    if (typeof path === 'string' && path.length > 0) {
      window.location.href = path;
    }
  }

  // Expose globally
  if (typeof window !== 'undefined') {
    window.Router = Router;
    window.router = Router;
    window.navigateTo = navigateTo;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
  }
})();
