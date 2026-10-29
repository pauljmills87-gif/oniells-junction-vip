
// VIP ADMIN — MEMBER MANAGEMENT

const membersTile =
  document.querySelector('[data-tool="members"]');

const membersDetail =
  document.getElementById("detail");

const membersPanel = document.createElement("section");

membersPanel.className = "detail";
membersPanel.hidden = true;

membersPanel.innerHTML = `
  <h3>VIP Members</h3>
  <p class="muted">
    Search members, manage access and reset PINs.
  </p>

  <form id="members-search-form" class="members-search">
    <label>
      Venue
      <select id="members-venue">
        <option value="both">Both venues</option>
        <option value="ON">O'Neills</option>
        <option value="JR">The Junction</option>
      </select>
    </label>

    <label>
      Search
      <input
        id="members-query"
        type="search"
        placeholder="Name or membership number"
        maxlength="50"
      >
    </label>

    <button type="submit">Search Members</button>
  </form>

  <p id="members-status" class="muted"
     role="status" aria-live="polite"></p>

  <div id="members-list"></div>

  <div class="members-pages">
    <button id="members-prev" type="button">
      Previous
    </button>
    <span id="members-page-label"></span>
    <button id="members-next" type="button">
      Next
    </button>
  </div>
`;

membersDetail.after(membersPanel);

// Styles matching our admin dashboard
const membersStyles = document.createElement("style");

membersStyles.textContent = `
  .members-search {
    display: grid;
    gap: 12px;
    margin: 16px 0;
  }

  .members-search label {
    display: grid;
    gap: 6px;
    font-weight: bold;
    font-size: 14px;
  }

  .members-search input,
  .members-search select,
  .member-pin-input {
    padding: 11px;
    min-height: 43px;
    border: 1px solid #bea36e;
    border-radius: 8px;
    background: #fffaf0;
    color: #19231b;
    font: inherit;
    width: 100%;
  }

  .members-search button,
  .member-action,
  .members-pages button {
    border: 1px solid #c0a16b;
    border-radius: 8px;
    padding: 11px 13px;
    background: #d6b572;
    color: #171b13;
    font: inherit;
    font-weight: bold;
    cursor: pointer;
  }

  .member-entry {
    margin: 12px 0;
    padding: 17px;
    border: 1px solid #a48b5b;
    border-radius: 13px;
    background: #111d15;
  }

  .member-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }

  .member-head strong {
    display: block;
    font-size: 17px;
    overflow-wrap: anywhere;
  }

  .member-code {
    display: block;
    color: #ddc18d;
    font-size: 13px;
    margin-top: 6px;
  }

  .member-state {
    border-radius: 30px;
    border: 1px solid #b9a572;
    padding: 6px 10px;
    font-size: 12px;
  }

  .member-actions {
    margin-top: 15px;
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
  }

  .member-pin-row {
    display: flex;
    gap: 9px;
    margin-top: 12px;
  }

  .member-pin-input {
    max-width: 170px;
  }

  .member-action:disabled,
  .members-pages button:disabled {
    opacity: .45;
    cursor: default;
  }

  .members-pages {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 17px;
  }
`;

document.head.append(membersStyles);

const membersVenue =
  document.getElementById("members-venue");

const membersQuery =
  document.getElementById("members-query");

const membersList =
  document.getElementById("members-list");

const membersStatus =
  document.getElementById("members-status");

const membersPrev =
  document.getElementById("members-prev");

const membersNext =
  document.getElementById("members-next");

const membersPageLabel =
  document.getElementById("members-page-label");

let membersPage = 0;
let membersTotal = 0;
let membersPageSize = 20;
let membersRequestVersion = 0;

async function memberAction(payload) {
  const response = await fetch(
    "/api/admin-members",
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error || "Could not update member"
    );
  }

  return data;
}

// Build individual member cards using safe text nodes
function renderMember(member) {
  const entry = document.createElement("div");
  entry.className = "member-entry";

  const head = document.createElement("div");
  head.className = "member-head";

  const identity = document.createElement("div");

  const name = document.createElement("strong");
  name.textContent = member.full_name;

  const code = document.createElement("span");
  code.className = "member-code";
  code.textContent =
    member.membership_number +
    " · " +
    (member.venue_code === "ON"
      ? "O'Neills"
      : "The Junction");

  identity.append(name, code);

  const state = document.createElement("span");
  state.className = "member-state";
  state.textContent =
    member.is_active ? "Active" : "Inactive";

  head.append(identity, state);

  const actions = document.createElement("div");
  actions.className = "member-actions";

  const statusButton = document.createElement("button");
  statusButton.type = "button";
  statusButton.className = "member-action";
  statusButton.textContent = member.is_active
    ? "Deactivate"
    : "Reactivate";

  statusButton.addEventListener("click", async () => {
    const newState = !member.is_active;

    if (!window.confirm(
      (newState ? "Reactivate " : "Deactivate ") +
      member.full_name + "?"
    )) {
      return;
    }

    statusButton.disabled = true;

    try {
      await memberAction({
        action: "set-status",
        memberId: member.id,
        active: newState
      });

      membersStatus.textContent =
        "Membership status updated.";

      await loadMembers();

    } catch (error) {
      membersStatus.textContent = error.message;
      statusButton.disabled = false;
    }
  });

  actions.append(statusButton);

  const pinRow = document.createElement("div");
  pinRow.className = "member-pin-row";

  const pinInput = document.createElement("input");
  pinInput.className = "member-pin-input";
  
pinInput.type = "text";
pinInput.inputMode = "numeric";
pinInput.autocomplete = "off";
pinInput.name = "vip-member-pin-reset-" + member.id;
  pinInput.inputMode = "numeric";
  pinInput.maxLength = 4;
  pinInput.placeholder = "New 4-digit PIN";
  pinInput.autocomplete = "new-password";
  pinInput.setAttribute(
    "aria-label",
    "New PIN for " + member.full_name
  );

  pinInput.addEventListener("input", () => {
    pinInput.value = pinInput.value
      .replace(/\D/g, "")
      .slice(0, 4);
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "member-action";
  resetButton.textContent = "Reset PIN";

  resetButton.addEventListener("click", async () => {
    const pin = pinInput.value;

    if (!/^\d{4}$/.test(pin)) {
      membersStatus.textContent =
        "Please enter a new 4-digit PIN.";
      return;
    }

    if (!window.confirm(
      "Reset PIN for " + member.full_name + "?"
    )) {
      return;
    }

    resetButton.disabled = true;

    try {
      await memberAction({
        action: "reset-pin",
        memberId: member.id,
        pin
      });

      pinInput.value = "";

      membersStatus.textContent =
        "PIN reset for " + member.membership_number +
        ". Give the customer their new PIN.";

    } catch (error) {
      membersStatus.textContent = error.message;

    } finally {
      resetButton.disabled = false;
    }
  });

  pinRow.append(pinInput, resetButton);

  entry.append(head, actions, pinRow);

  return entry;
}

// Fetch the real member list
async function loadMembers() {
  const version = ++membersRequestVersion;

  membersStatus.textContent = "Loading members...";
  membersList.replaceChildren();

  const params = new URLSearchParams({
    venue: membersVenue.value,
    q: membersQuery.value.trim(),
    page: String(membersPage)
  });

  try {
    const response = await fetch(
      "/api/admin-members?" + params,
      {
        credentials: "same-origin",
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (version !== membersRequestVersion) return;

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || "Unable to load members"
      );
    }

    membersTotal = data.total;
    membersPageSize = data.pageSize;

    data.members.forEach(member => {
      membersList.append(renderMember(member));
    });

    const start = membersTotal === 0
      ? 0
      : membersPage * membersPageSize + 1;

    const end = Math.min(
      membersTotal,
      (membersPage + 1) * membersPageSize
    );

    membersStatus.textContent =
      membersTotal === 0
        ? "No members found."
        : `Showing ${start}–${end} of ${membersTotal} members`;

    membersPageLabel.textContent =
      "Page " + (membersPage + 1);

    membersPrev.disabled = membersPage === 0;

    membersNext.disabled =
      (membersPage + 1) * membersPageSize >= membersTotal;

  } catch (error) {
    if (version !== membersRequestVersion) return;

    membersStatus.textContent = error.message;
  }
}

// Open VIP Members from the existing dashboard
membersTile.addEventListener("click", () => {
  membersDetail.hidden = true;
  membersPanel.hidden = false;

  const selected =
    document.getElementById("venue")?.value;

  if (["ON", "JR", "both"].includes(selected)) {
    membersVenue.value = selected;
  }

  membersPage = 0;
  loadMembers();

  membersPanel.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
});

// Hide when another dashboard section is opened
document.querySelectorAll(
  '[data-tool]:not([data-tool="members"])'
).forEach(button => {
  button.addEventListener("click", () => {
    membersPanel.hidden = true;
  });
});

document.getElementById("members-search-form")
  .addEventListener("submit", event => {
    event.preventDefault();
    membersPage = 0;
    loadMembers();
  });

membersVenue.addEventListener("change", () => {
  membersPage = 0;
  loadMembers();
});

membersPrev.addEventListener("click", () => {
  if (membersPage > 0) {
    membersPage--;
    loadMembers();
  }
});

membersNext.addEventListener("click", () => {
  if ((membersPage + 1) * membersPageSize < membersTotal) {
    membersPage++;
    loadMembers();
  }
});
