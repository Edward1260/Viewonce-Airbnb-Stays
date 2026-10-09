(() => {
  const currentScript = document.currentScript;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('luxury-theme.css?v=4', currentScript ? currentScript.src : window.location.href).href;
  stylesheet.dataset.viewonceTheme = 'true';

  const applyTheme = () => {
    document.body?.classList.add('viewonce-luxury-theme');
    if (document.head && !document.querySelector('[data-viewonce-theme]')) {
      document.head.appendChild(stylesheet);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTheme, { once: true });
  } else {
    applyTheme();
  }
})();
