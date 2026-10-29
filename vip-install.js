// Android Install VIP App button. Does not register a second service worker.
(() => {
  "use strict";
  // Register the EXISTING OneSignal worker for the home page, too.
  // Do not register a second root-scope service worker: it can break push.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/OneSignalSDKWorker.js", { scope: "/" })
      .catch(error => console.warn("VIP install worker:", error));
  }
  const isAndroid = /Android/i.test(navigator.userAgent || "");
  if (!isAndroid) return;

  let pendingPrompt = null;
  let installed = window.matchMedia("(display-mode: standalone)").matches;
  const home = document.getElementById("home-screen");
  if (!home || installed) return;

  const button = document.createElement("button");
  button.type = "button";
  button.id = "vip-install-button";
  button.textContent = "↓ Install VIP App";
  button.setAttribute("aria-label", "Install VIP Loyalty App on Android");
  button.style.cssText = [
    "position:fixed", "z-index:9999", "left:50%", "transform:translateX(-50%)",
    "bottom:max(18px,env(safe-area-inset-bottom))", "max-width:calc(100vw - 32px)",
    "padding:14px 24px", "border-radius:99px", "border:2px solid #f7d98e",
    "background:#083820", "color:#ffe4a4", "font-weight:800", "font-size:16px",
    "box-shadow:0 6px 24px #000b", "cursor:pointer", "white-space:nowrap"
  ].join(";");

  function onHome() {
    return !home.classList.contains("is-hidden") &&
      getComputedStyle(home).display !== "none";
  }

  function refresh() {
    button.hidden = installed || !onHome() || !pendingPrompt;
    button.style.display = button.hidden ? "none" : "block";
  }

  function showInstructions() {
    let notice = document.getElementById("vip-install-help");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "vip-install-help";
      notice.setAttribute("role", "status");
      notice.style.cssText = [
        "position:fixed", "z-index:10000", "bottom:90px", "left:16px", "right:16px",
        "max-width:440px", "margin:auto", "padding:20px", "border-radius:16px",
        "background:#092719", "border:1px solid #d9b976", "color:#fff4d4",
        "box-shadow:0 10px 34px #000c", "text-align:center", "font-size:15px"
      ].join(";");
      const content = document.createElement("p");
      content.textContent = "In Android Chrome, tap the three-dot menu (⋮), then choose ‘Add to Home screen’ or ‘Install app’.";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Got it";
      close.style.cssText = "background:#d9b976;color:#081c13;padding:9px 24px;border:0;border-radius:10px;font-weight:bold;";
      close.addEventListener("click", () => notice.remove());
      notice.append(content, close);
      document.body.appendChild(notice);
    }
  }

  button.addEventListener("click", async () => {
    if (!pendingPrompt) return;
    const promptEvent = pendingPrompt;
    pendingPrompt = null;
    try {
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result?.outcome === "accepted") {
        button.textContent = "Installing…";
      } else {
        button.textContent = "↓ Install VIP App";
      }
    } catch {
      showInstructions();
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    pendingPrompt = event;
    button.textContent = "↓ Install VIP App";
    refresh();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    pendingPrompt = null;
    refresh();
    document.getElementById("vip-install-help")?.remove();
  });

  new MutationObserver(refresh).observe(home, {
    attributes: true,
    attributeFilter: ["class", "style"]
  });
  window.addEventListener("hashchange", refresh);
  document.body.appendChild(button);
  refresh();
})();
