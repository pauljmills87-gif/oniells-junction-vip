
/*
  O'NEILLS & THE JUNCTION — VIP LOYALTY APP
  Customer venue selection and secure login
  Four-digit PIN authentication via /api/login
*/

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

// PAGE ELEMENTS

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
  loginForm.querySelector('button[type="submit"], input[type="submit"]');

let currentVenue = null;
let loginInProgress = false;
let routeVersion = 0;

// SHOW THE CORRECT VENUE SCREEN

function showRoute() {
  routeVersion++;

  const hash = window.location.hash;

  const id = hash.startsWith("#/login/")
    ? hash.slice(8)
    : "";

  const venue = venues[id];

  // HOME SCREEN

  if (!venue) {
    currentVenue = null;

    home.classList.remove("is-hidden");
    login.classList.add("is-hidden");

    document.title = "VIP Loyalty App | Choose Your Venue";

    return;
  }

  // VENUE LOGIN SCREEN

  currentVenue = id;

  logo.src = venue.logo;
  logo.alt = venue.title + " " + venue.location + " logo";

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

// VENUE BUTTONS

document.querySelectorAll("[data-venue]").forEach((button) => {
  button.addEventListener("click", () => {
    const venue = button.dataset.venue;

    if (venues[venue]) {
      window.location.hash = "#/login/" + venue;
    }
  });
});

// BACK TO HOME

document.getElementById("back-button").addEventListener(
  "click",
  () => {
    window.location.hash = "#/";
  }
);

// SHOW / HIDE PIN

toggle.addEventListener("click", () => {
  const show = pinInput.type === "password";

  pinInput.type = show ? "text" : "password";

  toggle.textContent = show ? "Hide" : "Show";

  toggle.setAttribute("aria-pressed", String(show));
});

// FORMAT MEMBERSHIP NUMBER

numberInput.addEventListener("input", () => {
  numberInput.value = numberInput.value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
});

// ONLY ALLOW FOUR PIN DIGITS

pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value
    .replace(/\D/g, "")
    .slice(0, 4);
});

// REAL CUSTOMER LOGIN

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loginInProgress) {
    return;
  }

  const venueId = currentVenue;
  const venue = venues[venueId];

  if (!venue) {
    status.textContent = "Please select your venue first.";
    return;
  }

  const membershipNumber = numberInput.value
    .trim()
    .toUpperCase();

  const pin = pinInput.value;

  // CHECK MEMBERSHIP FORMAT

  if (!membershipNumber.startsWith(venue.prefix)) {
    status.textContent =
      "Your membership number must start with " +
      venue.prefix;

    return;
  }

  // CHECK PIN FORMAT

  if (!/^\d{4}$/.test(pin)) {
    status.textContent =
      "Please enter your 4-digit PIN.";

    return;
  }

  loginInProgress = true;

  const requestRouteVersion = routeVersion;

  if (loginButton) {
    loginButton.disabled = true;
  }

  status.textContent = "Checking your membership...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      credentials: "same-origin",

      body: JSON.stringify({
        venue: venueId,
        membershipNumber: membershipNumber,
        pin: pin
      })
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("Invalid server response");
    }

    if (requestRouteVersion !== routeVersion) {
      return;
    }

    // FAILED LOGIN

    if (!response.ok || !result.ok) {
      pinInput.value = "";

      status.textContent =
        result.error ||
        "Unable to log in. Please try again.";

      return;
    }

    // SUCCESSFUL LOGIN

    pinInput.value = "";

    status.textContent =
      "Welcome, " + result.name +
      "! Your VIP membership has been verified.";

    // NEXT DEVELOPMENT STAGE:
    // Open the customer's live digital VIP card.
    // The secure login session is stored in an
    // HttpOnly cookie by the backend.

  } catch (error) {
    console.error("VIP login request failed:", error);

    if (requestRouteVersion === routeVersion) {
      status.textContent =
        "Connection problem. Please try again.";
    }

  } finally {
    loginInProgress = false;

    if (loginButton) {
      loginButton.disabled = false;
    }
  }
});

// FORGOTTEN PIN

document.getElementById("forgot-pin").addEventListener(
  "click",
  () => {
    status.textContent =
      "For a PIN reset, please ask a member of staff at the bar.";
  }
);

// HANDLE NAVIGATION

window.addEventListener("hashchange", showRoute);

// START APPLICATION

showRoute();
