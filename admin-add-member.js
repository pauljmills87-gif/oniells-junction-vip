
// O'Neills & Junction VIP — Add Customer form

const addTile = document.querySelector('[data-tool="add"]');
const detailPanel = document.getElementById("detail");

const panel = document.createElement("section");
panel.id = "add-member-panel";
panel.className = "detail";
panel.hidden = true;

detailPanel.after(panel);

// Form styling
const formStyle = document.createElement("style");

formStyle.textContent = `
  #add-member-panel form {
    display: grid;
    gap: 12px;
    max-width: 530px;
  }

  #add-member-panel label {
    display: grid;
    gap: 6px;
    font-weight: 600;
  }

  #add-member-panel input,
  #add-member-panel select {
    width: 100%;
    min-height: 44px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #bca371;
    background: #fffaf0;
    color: #18221b;
    font: inherit;
  }

  #add-member-panel button {
    padding: 13px;
    border: 1px solid #e7c587;
    border-radius: 9px;
    background: #d6b36f;
    color: #171b13;
    font-weight: 700;
  }

  #add-member-panel button:disabled {
    opacity: .6;
  }

  #member-result {
    white-space: pre-line;
    line-height: 1.6;
  }
`;

document.head.append(formStyle);

// Registration form
panel.innerHTML = `
  <h3>Add New VIP Member</h3>

  <p class="muted">
    Register a member for either bar.
    Their membership number is generated automatically.
  </p>

  <form id="add-member-form">

    <label>
      Venue
      <select name="venueCode" required>
        <option value="">Choose a bar</option>
        <option value="ON">
          O'Neills — Vilamoura Marina
        </option>
        <option value="JR">
          The Junction — Almancil
        </option>
      </select>
    </label>

    <label>
      Customer's full name
      <input
        name="fullName"
        minlength="2"
        maxlength="100"
        required
        autocomplete="off"
      >
    </label>

    <label>
      Customer's 4-digit PIN
      <input
        name="pin"
        type="password"
        inputmode="numeric"
        pattern="[0-9]{4}"
        minlength="4"
        maxlength="4"
        autocomplete="new-password"
        required
      >
    </label>

    <button
      type="submit"
      id="create-member-button"
    >
      Create VIP Membership
    </button>

    <p
      id="member-result"
      role="status"
      aria-live="polite"
    ></p>

  </form>
`;

// Open customer form from Add Customer tile
addTile.addEventListener("click", () => {
  detailPanel.hidden = true;
  panel.hidden = false;

  const selectedVenue =
    document.getElementById("venue")?.value;

  const select =
    panel.querySelector('[name="venueCode"]');

  if (
    selectedVenue === "ON" ||
    selectedVenue === "JR"
  ) {
    select.value = selectedVenue;
  }

  panel.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
});

// Hide form when another dashboard tile is selected
document.querySelectorAll(
  '[data-tool]:not([data-tool="add"])'
).forEach(button => {
  button.addEventListener("click", () => {
    panel.hidden = true;
  });
});

// Register a real customer
panel.querySelector("form").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const result = document.getElementById("member-result");
    const submit = document.getElementById("create-member-button");

    const venueCode = form.elements.venueCode.value;
    const fullName = form.elements.fullName.value.trim();
    const pin = form.elements.pin.value;

    if (!/^\d{4}$/.test(pin)) {
      result.textContent = "Enter exactly four digits.";
      return;
    }

    submit.disabled = true;
    result.textContent = "Creating membership...";

    try {
      const response = await fetch(
        "/api/admin-add-member",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            venueCode,
            fullName,
            pin
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        result.textContent =
          data.error || "Unable to create member.";
        return;
      }

      // Clear sensitive information
      form.elements.pin.value = "";
      form.elements.fullName.value = "";

      result.textContent =
        "✓ Membership created!\n" +
        data.fullName + "\n" +
        "Membership number: " +
        data.membershipNumber + "\n" +
        "Give the customer their number. " +
        "They can now log in.";

    } catch {
      result.textContent =
        "Connection problem. Please try again.";

    } finally {
      submit.disabled = false;
    }
  }
);
