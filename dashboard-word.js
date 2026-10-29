
// VIP ADMIN — WORD OF THE DAY CONTROLS

const wordTile =
  document.querySelector('[data-tool="word"]');

const wordDetail = document.getElementById("detail");

const wordPanel = document.createElement("section");

wordPanel.className = "detail";
wordPanel.hidden = true;

wordPanel.innerHTML = `
  <h3>Word of the Day</h3>

  <p class="muted">
    Choose a venue to view or change today's
    verification word.
  </p>

  <div class="word-form">

    <label for="word-venue">Venue</label>
    <select id="word-venue">
      <option value="ON">
        O'Neills — Vilamoura Marina
      </option>
      <option value="JR">
        The Junction Roadhouse — Almancil
      </option>
    </select>

    <div class="word-current">
      <small>TODAY'S WORD</small>
      <strong id="word-display">Loading...</strong>
      <span id="word-source"></span>
    </div>

    <form id="set-word-form">
      <label for="new-word">New word</label>

      <input
        id="new-word"
        type="text"
        minlength="3"
        maxlength="24"
        pattern="[A-Za-z]{3,24}"
        placeholder="e.g. SHAMROCK"
        autocomplete="off"
        required
      >

      <button id="save-word" type="submit">
        Save Today's Word
      </button>
    </form>

    <button id="reset-word" type="button">
      Return to Automatic Word
    </button>

    <p id="word-status" role="status"
       aria-live="polite"></p>

    <p class="muted">
      Manual words apply to today only.
      A new automatic word is selected tomorrow.
    </p>
  </div>
`;

wordDetail.after(wordPanel);

const wordStyle = document.createElement("style");

wordStyle.textContent = `
  .word-form {
    display: grid;
    gap: 13px;
    max-width: 530px;
  }

  .word-form label {
    font-weight: bold;
    font-size: 14px;
  }

  .word-form input,
  .word-form select {
    width: 100%;
    padding: 12px;
    border: 1px solid #c4a56e;
    border-radius: 9px;
    background: #fffaf0;
    color: #182119;
    font: inherit;
  }

  .word-current {
    padding: 23px 12px;
    border: 1px solid #bca16d;
    border-radius: 14px;
    background: #08130b;
    text-align: center;
    display: grid;
    gap: 10px;
  }

  .word-current small {
    color: #d8bd84;
    letter-spacing: 2px;
  }

  .word-current strong {
    color: #f0d49a;
    font-size: clamp(24px, 7vw, 35px);
    overflow-wrap: anywhere;
  }

  .word-current span {
    color: #b7c6b4;
    font-size: 13px;
  }

  #set-word-form {
    display: grid;
    gap: 12px;
  }

  #save-word,
  #reset-word {
    padding: 13px;
    border-radius: 9px;
    cursor: pointer;
    font: inherit;
    font-weight: bold;
  }

  #save-word {
    background: #d9b977;
    color: #181b13;
    border: 0;
  }

  #reset-word {
    background: transparent;
    color: #edcf93;
    border: 1px solid #ae955e;
  }

  #word-status {
    min-height: 20px;
    color: #edcf93;
  }

  #save-word:disabled,
  #reset-word:disabled {
    opacity: .55;
    cursor: wait;
  }
`;

document.head.append(wordStyle);

const wordVenue = document.getElementById("word-venue");
const wordDisplay = document.getElementById("word-display");
const wordSource = document.getElementById("word-source");
const wordStatus = document.getElementById("word-status");
const newWordInput = document.getElementById("new-word");
const saveWordButton = document.getElementById("save-word");
const resetWordButton = document.getElementById("reset-word");

let wordRequestVersion = 0;

// Get the live word from our database backend
async function loadDailyWord() {
  const venueCode = wordVenue.value;
  const version = ++wordRequestVersion;

  wordDisplay.textContent = "Loading...";
  wordSource.textContent = "";
  wordStatus.textContent = "";

  try {
    const response = await fetch(
      "/api/admin-word?venue=" +
      encodeURIComponent(venueCode),
      {
        credentials: "same-origin",
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (version !== wordRequestVersion) return;

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || "Unable to load word"
      );
    }

    wordDisplay.textContent = data.word;
    wordSource.textContent =
      data.source === "manual"
        ? "Manually selected · " + data.date
        : "Automatic daily word · " + data.date;

  } catch (error) {
    if (version !== wordRequestVersion) return;

    wordDisplay.textContent = "Unavailable";
    wordStatus.textContent = error.message;
  }
}

// Save or reset a word
async function changeDailyWord(action) {
  const venueCode = wordVenue.value;

  const word = newWordInput.value
    .trim()
    .toUpperCase();

  if (action === "set" && !/^[A-Z]{3,24}$/.test(word)) {
    wordStatus.textContent =
      "Enter 3–24 letters without spaces.";
    return;
  }

  saveWordButton.disabled = true;
  resetWordButton.disabled = true;
  wordVenue.disabled = true;

  wordStatus.textContent = "Updating daily word...";

  try {
    const response = await fetch("/api/admin-word", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        venueCode,
        action,
        word: action === "set" ? word : ""
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || "Could not update daily word"
      );
    }

    wordDisplay.textContent = data.word;
    wordSource.textContent =
      data.source === "manual"
        ? "Manually selected · " + data.date
        : "Automatic daily word · " + data.date;

    wordStatus.textContent =
      "Word updated successfully!";

    newWordInput.value = "";

  } catch (error) {
    wordStatus.textContent = error.message;

  } finally {
    saveWordButton.disabled = false;
    resetWordButton.disabled = false;
    wordVenue.disabled = false;
  }
}

// Open Word of the Day from the dashboard
wordTile.addEventListener("click", () => {
  wordDetail.hidden = true;
  wordPanel.hidden = false;

  const mainVenue = document.getElementById("venue")?.value;

  if (["ON", "JR"].includes(mainVenue)) {
    wordVenue.value = mainVenue;
  }

  loadDailyWord();

  wordPanel.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
});

// Hide this panel when another tool is selected
document.querySelectorAll(
  '[data-tool]:not([data-tool="word"])'
).forEach(button => {
  button.addEventListener("click", () => {
    wordPanel.hidden = true;
  });
});

wordVenue.addEventListener("change", loadDailyWord);

document.getElementById("set-word-form")
  .addEventListener("submit", event => {
    event.preventDefault();
    changeDailyWord("set");
  });

resetWordButton.addEventListener("click", () => {
  changeDailyWord("reset");
});
