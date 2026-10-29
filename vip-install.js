// O'Neills & The Junction VIP - Android install button
// Replace only vip-install.js. Uses the existing OneSignal worker.
(() => {
  "use strict";

  if (!/Android/i.test(navigator.userAgent || "")) return;

  // The link in index.html already loads this file with `defer`.
  // A fallback DOM-ready check also supports a regular script tag.
  function start() {
    if (document.getElementById("vip-install-button")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Continue using the app's EXISTING worker, so push notifications
    // aren't replaced by a second root-level worker.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/OneSignalSDKWorker.js", { scope: "/" })
        .catch(error => console.warn("VIP service worker:", error));
    }

    let pendingPrompt = null;
    let installed = false;
    const home = document.getElementById("home-screen");

    const button = document.createElement("button");
    button.id = "vip-install-button";
    button.type = "button";
    button.textContent = "⬇ Install VIP App";
    button.setAttribute("aria-label", "Install VIP Loyalty App on Android");
    button.style.cssText = [
      "position:fixed", "bottom:max(20px,env(safe-area-inset-bottom))",
      "left:50%", "transform:translateX(-50%)", "z-index:99999",
      "padding:15px 28px", "max-width:calc(100vw - 24px)",
      "background:#073b24", "color:#ffe3a0", "border:2px solid #e8c477",
      "border-radius:50px", "font-size:16px", "font-weight:800",
      "font-family:Arial,sans-serif", "white-space:nowrap", "cursor:pointer",
      "box-shadow:0 6px 25px rgba(0,0,0,.65)"
    ].join(";");

    // Keep the button visible when Chrome has not yet fired
    // `beforeinstallprompt`. Never hide it for that reason again.
    function onHome() {
      if (!home) return true;
      return !home.classList.contains("is-hidden") &&
        getComputedStyle(home).display !== "none";
    }

    function refresh() {
      const hide = installed ||
        window.matchMedia("(display-mode: standalone)").matches ||
        !onHome();
      button.hidden = hide;
      button.style.display = hide ? "none" : "block";
    }

    function showHelp(text) {
      let box = document.getElementById("vip-install-help");
      if (box) box.remove();
      box = document.createElement("div");
      box.id = "vip-install-help";
      box.setAttribute("role", "status");
      box.style.cssText = [
        "position:fixed", "bottom:90px", "left:16px", "right:16px",
        "z-index:100000", "margin:auto", "max-width:420px", "padding:18px",
        "background:#092719", "color:#fff1cc", "border:1px solid #e8c477",
        "border-radius:15px", "text-align:center", "font-size:15px",
        "line-height:1.5", "box-shadow:0 8px 25px rgba(0,0,0,.6)"
      ].join(";");

      const message = document.createElement("p");
      message.textContent = text;
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "OK";
      close.style.cssText = [
        "background:#e8c477", "color:#092719", "border:none",
        "border-radius:8px", "padding:10px 30px", "font-weight:bold"
      ].join(";");
      close.addEventListener("click", () => box.remove());
      box.append(message, close);
      document.body.appendChild(box);
    }

    // Save Chrome's one-time prompt so it can be opened on a tap.
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      pendingPrompt = event;
      button.textContent = "⬇ Install VIP App";
      refresh();
    });

    button.addEventListener("click", async () => {
      if (installed) return;
      if (!pendingPrompt) {
        showHelp(
          "Chrome has not offered the installation popup yet. " +
          "Open this website directly in Android Chrome. " +
          "If Chrome offers Install app in its menu, you can install it there."
        );
        return;
      }

      const event = pendingPrompt;
      pendingPrompt = null;
      try {
        await event.prompt();
        const choice = await event.userChoice;
        button.textContent = choice?.outcome === "accepted"
          ? "Installing VIP App…" : "⬇ Install VIP App";
      } catch (error) {
        console.warn("VIP install prompt:", error);
        button.textContent = "⬇ Install VIP App";
        showHelp("Android could not open the installation popup.");
      }
    });

    window.addEventListener("appinstalled", () => {
      installed = true;
      pendingPrompt = null;
      document.getElementById("vip-install-help")?.remove();
      refresh();
    });

    if (home) {
      new MutationObserver(refresh).observe(home, {
        attributes: true,
        attributeFilter: ["class", "style"]
      });
    }
    window.addEventListener("hashchange", refresh);
    window.addEventListener("pageshow", refresh);
    document.body.appendChild(button);
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
