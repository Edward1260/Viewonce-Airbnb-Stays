(function () {
  'use strict';

  var installPrompt = null;
  var installButtons = [];

  function setInstallButtonsVisible(visible) {
    installButtons.forEach(function (button) {
      button.hidden = !visible;
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
  }

  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function collectInstallButtons() {
    installButtons = Array.prototype.slice.call(document.querySelectorAll('[data-install-app]'));
    setInstallButtonsVisible(!isInstalled());
  }

  function showInstallHelp() {
    var existingDialog = document.getElementById('viewonce-install-help');
    if (existingDialog) {
      existingDialog.showModal();
      return;
    }

    var isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    var isAndroid = /android/i.test(window.navigator.userAgent);
    var instruction = isAppleMobile
      ? 'Open the Share menu in Safari, then choose “Add to Home Screen”.'
      : isAndroid
        ? 'Open your browser menu and choose “Install app” or “Add to Home screen”.'
        : 'Open your browser menu and choose “Install ViewOnce” or “Install page as app”.';
    var dialog = document.createElement('dialog');
    dialog.id = 'viewonce-install-help';
    dialog.setAttribute('aria-labelledby', 'viewonce-install-title');
    dialog.innerHTML =
      '<form method="dialog" style="max-width:420px;padding:28px;border:1px solid rgba(217,182,111,.4);border-radius:20px;background:#101d31;color:#f7f2e8;font:16px/1.6 system-ui,sans-serif;box-shadow:0 24px 80px rgba(0,0,0,.45)">' +
        '<h2 id="viewonce-install-title" style="margin:0 0 10px;color:#efd08b;font-size:22px">Install ViewOnce</h2>' +
        '<p style="margin:0 0 22px;color:rgba(247,242,232,.78)">' + instruction + '</p>' +
        '<button style="border:0;border-radius:999px;padding:11px 22px;background:#d9b66f;color:#17130c;font-weight:700;cursor:pointer">Got it</button>' +
      '</form>';
    dialog.style.cssText = 'border:0;border-radius:20px;padding:0;background:transparent;max-width:calc(100vw - 32px)';
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  async function install() {
    if (!installPrompt) {
      showInstallHelp();
      return false;
    }
    var promptEvent = installPrompt;
    installPrompt = null;
    promptEvent.prompt();
    var choice = await promptEvent.userChoice;
    if (choice && choice.outcome === 'accepted') setInstallButtonsVisible(false);
    return Boolean(choice && choice.outcome === 'accepted');
  }

  window.ViewOncePWA = { install: install };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      var serviceWorkerUrl = new URL('service-worker.js', document.baseURI);
      navigator.serviceWorker.register(serviceWorkerUrl.href, {
        scope: new URL('./', serviceWorkerUrl).pathname
      }).catch(function (error) {
        console.warn('[ViewOnce] Offline support unavailable:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installPrompt = event;
    collectInstallButtons();
  });

  window.addEventListener('appinstalled', function () {
    installPrompt = null;
    setInstallButtonsVisible(false);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectInstallButtons);
  } else {
    collectInstallButtons();
  }
})();