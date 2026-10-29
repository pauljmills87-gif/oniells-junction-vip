
// O'Neills & Junction VIP — Broadcast Centre
// Admin poster upload, preview, test and live push.

(() => {
  const tile = document.querySelector('[data-tool="broadcast"]');
  const detail = document.getElementById("detail");

  if (!tile || !detail) {
    console.error("Broadcast dashboard elements missing");
    return;
  }

  const panel = document.createElement("section");
  panel.id = "vip-broadcast-panel";
  panel.className = "detail";
  panel.hidden = true;

  panel.innerHTML = `
    <h3>VIP Broadcast Centre</h3>
    <p class="muted">
      Upload an event poster and send an announcement
      to opted-in VIP subscribers.
    </p>

    <form id="vipbc-form" class="vipbc-form">

      <label for="vipbc-venue">Send to</label>
      <select id="vipbc-venue" required>
        <option value="ON">O'Neills — Vilamoura Marina</option>
        <option value="JR">The Junction — Almancil</option>
        <option value="both">Both Venues</option>
      </select>

      <label for="vipbc-title">Notification title</label>
      <input
        id="vipbc-title"
        type="text"
        maxlength="100"
        placeholder="2 FOR 1 COCKTAILS!"
        required
      >

      <label for="vipbc-message">Notification message</label>
      <textarea
        id="vipbc-message"
        rows="3"
        maxlength="250"
        placeholder="Exclusive VIP members-only offer!"
        required
      ></textarea>

      <label for="vipbc-file">Event poster</label>
      <input
        id="vipbc-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
      >

      <button
        id="vipbc-upload"
        type="button"
        class="vipbc-button"
      >
        Upload Poster
      </button>

      <p id="vipbc-upload-status" class="muted">
        No poster uploaded yet. Maximum 5 MB.
      </p>

      <div class="vipbc-preview">
        <div class="vipbc-preview-heading">
          NOTIFICATION PREVIEW
        </div>

        <img
          id="vipbc-image"
          alt="Event poster preview"
          hidden
        >

        <strong id="vipbc-preview-title">
          Your notification title
        </strong>

        <p id="vipbc-preview-message">
          Your announcement will appear here.
        </p>

        <small id="vipbc-preview-venue">
          O'Neills
        </small>
      </div>

      <div class="vipbc-test">
        <h4>Send a test notification</h4>

        <p class="muted">
          Paste your OneSignal test device's
          Subscription ID. This sends only to
          that one device.
        </p>

        <label for="vipbc-test-id">
          Test Subscription ID
        </label>

        <input
          id="vipbc-test-id"
          type="text"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          autocomplete="off"
          spellcheck="false"
        >

        <button
          id="vipbc-send-test"
          type="button"
          class="vipbc-button"
        >
          Send Test to My Device
        </button>
      </div>

      <div class="vipbc-live">
        <h4>Send to VIP members</h4>

        <p class="muted">
          This sends to subscribed devices tagged
          for the selected venue. Check your
          announcement before sending.
        </p>

        <button
          id="vipbc-send-live"
          type="button"
          class="vipbc-button vipbc-danger"
        >
          Send Broadcast to Members
        </button>
      </div>

      <p
        id="vipbc-status"
        role="status"
        aria-live="polite"
      ></p>

    </form>
  `;

  detail.after(panel);

  const style = document.createElement("style");

  style.textContent = `
    .vipbc-form {
      display: grid;
      gap: 11px;
      max-width: 580px;
    }

    .vipbc-form label {
      font-size: 14px;
      font-weight: bold;
      color: #f0dfbc;
    }

    .vipbc-form input,
    .vipbc-form textarea,
    .vipbc-form select {
      width: 100%;
      min-height: 43px;
      padding: 11px;
      background: #fffaf0;
      border: 1px solid #c1a36d;
      border-radius: 9px;
      color: #182017;
      font: inherit;
    }

    .vipbc-form textarea {
      resize: vertical;
      min-height: 85px;
    }

    .vipbc-form input[type="file"] {
      padding: 10px;
      color: #1b231b;
    }

    .vipbc-button {
      min-height: 46px;
      padding: 12px 15px;
      background: #d7b775;
      color: #171c14;
      border: 1px solid #d8bb80;
      border-radius: 9px;
      font: inherit;
      font-weight: bold;
      cursor: pointer;
    }

    .vipbc-button:disabled {
      opacity: .5;
      cursor: wait;
    }

    .vipbc-preview,
    .vipbc-test,
    .vipbc-live {
      padding: 18px;
      border: 1px solid #b99b61;
      border-radius: 14px;
      background: #0b170f;
      margin-top: 10px;
      display: grid;
      gap: 12px;
    }

    .vipbc-preview {
      text-align: center;
    }

    .vipbc-preview-heading {
      font-size: 11px;
      letter-spacing: 2px;
      color: #dec28b;
      font-weight: bold;
    }

    #vipbc-image {
      max-width: 100%;
      max-height: 380px;
      width: auto;
      margin: auto;
      object-fit: contain;
      border-radius: 9px;
    }

    #vipbc-image[hidden] {
      display: none;
    }

    #vipbc-preview-title {
      font-size: 21px;
      color: #f2d99d;
      overflow-wrap: anywhere;
    }

    #vipbc-preview-message {
      margin: 0;
      color: #f4f0e5;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    #vipbc-preview-venue {
      color: #d0b982;
    }

    .vipbc-test h4,
    .vipbc-live h4 {
      margin: 0;
      color: #efd18c;
    }

    .vipbc-test p,
    .vipbc-live p {
      margin: 0;
    }

    .vipbc-danger {
      background: #9e4136;
      border-color: #df8878;
      color: white;
    }

    #vipbc-status {
      min-height: 24px;
      line-height: 1.5;
      color: #f2d494;
      overflow-wrap: anywhere;
    }
  `;

  document.head.append(style);

  const $ = id => document.getElementById(id);

  const venue = $("vipbc-venue");
  const title = $("vipbc-title");
  const message = $("vipbc-message");
  const fileInput = $("vipbc-file");
  const image = $("vipbc-image");

  const uploadButton = $("vipbc-upload");
  const testButton = $("vipbc-send-test");
  const liveButton = $("vipbc-send-live");
  const testId = $("vipbc-test-id");
  const status = $("vipbc-status");
  const uploadStatus = $("vipbc-upload-status");

  let posterUrl = null;
  let previewUrl = null;
  let busy = false;

  const venueNames = {
    ON: "O'Neills — Vilamoura Marina",
    JR: "The Junction Roadhouse — Almancil",
    both: "O'Neills & The Junction"
  };

  function updatePreview() {
    $("vipbc-preview-title").textContent =
      title.value.trim() || "Your notification title";

    $("vipbc-preview-message").textContent =
      message.value.trim() ||
      "Your announcement will appear here.";

    $("vipbc-preview-venue").textContent =
      venueNames[venue.value];
  }

  function setBusy(value) {
    busy = value;
    uploadButton.disabled = value;
    testButton.disabled = value;
    liveButton.disabled = value;
    fileInput.disabled = value;
  }

  function showError(error) {
    status.textContent =
      error?.message || "Something went wrong.";
  }

  // Open Broadcast Centre
  tile.addEventListener("click", () => {
    detail.hidden = true;
    panel.hidden = false;

    const selected =
      document.getElementById("venue")?.value;

    if (["ON", "JR", "both"].includes(selected)) {
      venue.value = selected;
    }

    updatePreview();

    panel.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });

  // Hide it when another dashboard tile is clicked
  document.querySelectorAll(
    '[data-tool]:not([data-tool="broadcast"])'
  ).forEach(button => {
    button.addEventListener("click", () => {
      panel.hidden = true;
    });
  });

  title.addEventListener("input", updatePreview);
  message.addEventListener("input", updatePreview);
  venue.addEventListener("change", updatePreview);

  // Preview image locally when selected
  fileInput.addEventListener("change", () => {
    posterUrl = null;
    uploadStatus.textContent =
      "Image selected. Click Upload Poster.";

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    const file = fileInput.files[0];

    if (!file) {
      image.hidden = true;
      uploadStatus.textContent = "No poster selected.";
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"]
        .includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      image.hidden = true;
      uploadStatus.textContent =
        "Choose a JPG, PNG or WebP under 5 MB.";
      return;
    }

    previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.hidden = false;
  });

  // Upload poster to our Supabase Storage bucket
  uploadButton.addEventListener("click", async () => {
    if (busy) return;

    const file = fileInput.files[0];

    if (!file) {
      uploadStatus.textContent =
        "Choose an image first.";
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"]
        .includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      uploadStatus.textContent =
        "Invalid image or file exceeds 5 MB.";
      return;
    }

    setBusy(true);
    uploadStatus.textContent = "Uploading poster...";
    posterUrl = null;

    try {
      const form = new FormData();
      form.append("action", "upload");
      form.append("poster", file);

      const response = await fetch(
        "/api/admin-broadcast",
        {
          method: "POST",
          credentials: "same-origin",
          body: form
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Poster upload failed."
        );
      }

      posterUrl = result.posterUrl;

      uploadStatus.textContent =
        "Poster uploaded successfully!";
      status.textContent =
        "Image ready to attach to the notification.";

    } catch (error) {
      uploadStatus.textContent =
        "Upload failed.";
      showError(error);

    } finally {
      setBusy(false);
    }
  });

  function validateBroadcast() {
    if (title.value.trim().length < 3) {
      throw new Error("Enter a notification title.");
    }

    if (message.value.trim().length < 3) {
      throw new Error("Enter a notification message.");
    }

    if (fileInput.files.length && !posterUrl) {
      throw new Error(
        "Upload your selected poster before sending."
      );
    }
  }

  async function sendBroadcast(mode) {
    if (busy) return;

    try {
      validateBroadcast();
    } catch (error) {
      showError(error);
      return;
    }

    const selectedVenue = venue.value;

    if (mode === "test") {
      if (
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
          .test(testId.value.trim())
      ) {
        status.textContent =
          "Enter a valid OneSignal Subscription ID.";
        return;
      }

      if (!window.confirm(
        "Send this test notification to your single test device?"
      )) {
        return;
      }

    } else {
      const approved = window.prompt(
        "You are about to send this announcement to " +
        venueNames[selectedVenue] +
        " subscribers.\n\n" +
        "Title: " + title.value.trim() + "\n\n" +
        "Type SEND to confirm:"
      );

      if (approved !== "SEND") {
        status.textContent =
          "Live broadcast cancelled.";
        return;
      }
    }

    setBusy(true);

    status.textContent =
      mode === "test"
        ? "Sending test notification..."
        : "Submitting live broadcast...";

    try {
      const response = await fetch(
        "/api/admin-broadcast",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "send",
            mode,
            venueCode: selectedVenue,
            title: title.value.trim(),
            message: message.value.trim(),
            posterUrl,
            testSubscriptionId:
              mode === "test"
                ? testId.value.trim()
                : undefined,
            confirm:
              mode === "live" ? "SEND" : undefined,
            sendId: crypto.randomUUID()
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Broadcast failed."
        );
      }

      status.textContent =
        mode === "test"
          ? "Test notification accepted by OneSignal. Check your device."
          : "Broadcast accepted by OneSignal. Check its delivery report.";

      if (result.historySaved === false) {
        status.textContent +=
          " Warning: history could not be saved.";
      }

    } catch (error) {
      showError(error);

    } finally {
      setBusy(false);
    }
  }

  testButton.addEventListener("click", () => {
    sendBroadcast("test");
  });

  liveButton.addEventListener("click", () => {
    sendBroadcast("live");
  });

  $("vipbc-form").addEventListener("submit", event => {
    event.preventDefault();
  });

  updatePreview();
})();
