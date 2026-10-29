
/* O'Neills & The Junction VIP — Customer App */

const venues = {
  oneills: {
    title: "O'Neills",
    location: "Vilamoura Marina",
    logo: "assets/oneills-logo.png",
    example: "ON-0001",
    prefix: "ON-"
  },
  junction: {
    title: "The Junction Roadhouse",
    location: "Almancil",
    logo: "assets/junction-logo.png",
    example: "JR-0001",
    prefix: "JR-"
  }
};

const home = document.getElementById("home-screen");
const login = document.getElementById("login-screen");
const logo = document.getElementById("venue-logo");
const numberInput = document.getElementById("member-number");
const pinInput = document.getElementById("pin");
const status = document.getElementById("status-message");
const toggle = document.getElementById("pin-toggle");
const loginForm = document.getElementById("login-form");

const loginButton =
  document.getElementById("login-button") ||
  loginForm.querySelector(
    'button[type="submit"], input[type="submit"]'
  );

let currentVenue = null;
let loginInProgress = false;
let routeVersion = 0;

// Show home screen or the selected bar's login screen
function showRoute() {
  routeVersion++;

  const hash = window.location.hash;

  const id = hash.startsWith("#/login/")
    ? hash.slice(8)
    : "";

  const venue = venues[id];

  if (!venue) {
    currentVenue = null;

    home.classList.remove("is-hidden");
    login.classList.add("is-hidden");

    document.title =
      "VIP Loyalty App | Choose Your Venue";

    return;
  }

  currentVenue = id;

  logo.src = venue.logo;
  logo.alt =
    venue.title + " " + venue.location + " logo";

  login.classList.toggle(
    "junction-theme",
    id === "junction"
  );

  document.title = venue.title + " | VIP Member Login";

  numberInput.placeholder = "e.g. " + venue.example;
  numberInput.value = "";
  pinInput.value = "";
  pinInput.type = "password";

  toggle.textContent = "Show";
  toggle.setAttribute("aria-pressed", "false");

  status.textContent =
    "Enter your membership number and 4-digit PIN.";

  home.classList.add("is-hidden");
  login.classList.remove("is-hidden");

  window.scrollTo(0, 0);
}

// Real clickable venue buttons
document.querySelectorAll("[data-venue]").forEach(
  button => {
    button.addEventListener("click", () => {
      const id = button.dataset.venue;

      if (venues[id]) {
        window.location.hash = "#/login/" + id;
      }
    });
  }
);

// Back to venue selection
document.getElementById("back-button")
  .addEventListener("click", () => {
    window.location.hash = "#/";
  });

// Show or hide 4-digit PIN
toggle.addEventListener("click", () => {
  const show = pinInput.type === "password";

  pinInput.type = show ? "text" : "password";
  toggle.textContent = show ? "Hide" : "Show";

  toggle.setAttribute(
    "aria-pressed",
    String(show)
  );
});

// Membership number formatting
numberInput.addEventListener("input", () => {
  numberInput.value = numberInput.value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
});

// Only accept four PIN digits
pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value
    .replace(/\D/g, "")
    .slice(0, 4);
});

// Secure customer login
loginForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    if (loginInProgress) return;

    const venueId = currentVenue;
    const venue = venues[venueId];

    if (!venue) {
      status.textContent =
        "Please select your venue first.";
      return;
    }

    const membershipNumber = numberInput.value
      .trim()
      .toUpperCase();

    const pin = pinInput.value;

    if (!membershipNumber.startsWith(venue.prefix)) {
      status.textContent =
        "Your membership number must start with " +
        venue.prefix;
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      status.textContent =
        "Please enter your 4-digit PIN.";
      return;
    }

    loginInProgress = true;

    const startedAtRoute = routeVersion;

    if (loginButton) {
      loginButton.disabled = true;
    }

    status.textContent =
      "Checking your membership...";

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          venue: venueId,
          membershipNumber,
          pin
        })
      });

      const result = await response.json();

      if (startedAtRoute !== routeVersion) {
        return;
      }

      pinInput.value = "";

      if (!response.ok || !result.ok) {
        status.textContent =
          result.error || "Unable to log in.";
        return;
      }

      status.textContent =
        "Welcome, " + result.name +
        "! Your VIP membership has been verified.";

      window.location.assign("/card.html");

    } catch (error) {
      console.error(
        "VIP login request failed:",
        error
      );

      if (startedAtRoute === routeVersion) {
        status.textContent =
          "Connection problem. Please try again.";
      }

    } finally {
      loginInProgress = false;

      if (loginButton) {
        loginButton.disabled = false;
      }
    }
  }
);

// PIN reset instructions
document.getElementById("forgot-pin")
  .addEventListener("click", () => {
    status.textContent =
      "For a PIN reset, please ask a member " +
      "of staff at the bar.";
  });

// Support direct links and browser navigation
window.addEventListener("hashchange", showRoute);

showRoute();
