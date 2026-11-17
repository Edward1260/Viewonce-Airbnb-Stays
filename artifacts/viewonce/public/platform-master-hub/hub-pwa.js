(() => {
  const buttons = Array.from(document.querySelectorAll("[data-hub-install]"));
  const status = document.getElementById("hubInstallStatus");
  let deferredPrompt = null;
  const isInstalled = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const showStatus = (message) => {
    if (status) status.textContent = message;
  };

  if (isInstalled()) {
    buttons.forEach((button) => {
      button.hidden = true;
    });
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js", { scope: "./" })
      .catch((error) => {
        console.error("Platform Master Hub service worker registration failed:", error);
        showStatus("Install support could not start. Reload this page and try again.");
      });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showStatus("Ready to install. Select Install Platform Master Hub.");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    buttons.forEach((button) => {
      button.hidden = true;
    });
    showStatus("Platform Master Hub is installed.");
  });

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!deferredPrompt) {
        showStatus("If no prompt appears, use your browser menu and choose Install app or Add to Home Screen.");
        return;
      }

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      showStatus(choice.outcome === "accepted"
        ? "Platform Master Hub is installing."
        : "Installation was cancelled. You can try again from the browser menu.");
    });
  });
})();
