
// Permanent VIP app QR code — one code for both venues.
const VIP_APP_URL = 'https://oniells-junction-vip.vercel.app/';

// QR data for the permanent website address.
// No external QR service or JavaScript library is required.
const VIP_QR_ROWS = [
  '11111110111111111110001111111',
  '10000010000101100101001000001',
  '10111010010010100110001011101',
  '10111010111111101011001011101',
  '10111010101001010110001011101',
  '10000010110011100101101000001',
  '11111110101010101010101111111',
  '00000000101100010100100000000',
  '10001011110110010111011111001',
  '11101001111101011110001111111',
  '00111110111100010110100000001',
  '11010000111000010111011001011',
  '10101011110010100101110000010',
  '01000001110100111000001111111',
  '11010010110011110010000001101',
  '11100001100100101101111110011',
  '11110111100111100100110000010',
  '10111100011000111110011111011',
  '00011010111011111100111110101',
  '00111001100011001110100010011',
  '11110110101011001101111111001',
  '00000000100101111000100010001',
  '11111110110010010101101011101',
  '10000010011010110101100010011',
  '10111010110001100111111111001',
  '10111010010010011111000000001',
  '10111010010100011010110001111',
  '10000010001010100100100011011',
  '11111110101100001100110101010'
];

const qrTile = document.querySelector('[data-tool="qr"]');
const qrPanel = document.createElement('section');

qrPanel.id = 'vip-qr-panel';
qrPanel.className = 'detail';
qrPanel.hidden = true;

qrPanel.innerHTML = `
  <h3>Permanent VIP App QR Code</h3>

  <p class="muted">
    One QR code for O'Neills and The Junction.
    Customers scan it and choose their venue.
  </p>

  <div class="vip-qr-sheet">
    <div class="vip-qr-logos">
      <img src="assets/oneills-logo.png" alt="O'Neills">
      <img src="assets/junction-logo.png" alt="The Junction">
    </div>

    <h2>SCAN FOR VIP ACCESS</h2>

    <div id="vip-qr-image" class="vip-qr-image"></div>

    <p class="vip-qr-address" id="vip-qr-address"></p>

    <p>
      Open the app · Choose your venue · Show your VIP card
    </p>
  </div>

  <div class="vip-qr-actions">
    <button id="vip-qr-copy" type="button">
      Copy App Link
    </button>
    <button id="vip-qr-save" type="button">
      Save QR (SVG)
    </button>
    <button id="vip-qr-print" type="button">
      Print QR Poster
    </button>
  </div>

  <p id="vip-qr-feedback"
     role="status" aria-live="polite"
     class="muted"></p>
`;

document.getElementById('detail').after(qrPanel);

// Match the existing premium dashboard styling
const qrStyle = document.createElement('style');

qrStyle.textContent = `
  .vip-qr-sheet {
    max-width: 480px;
    margin: 18px auto;
    padding: 24px 14px;
    background: #fffdf7;
    color: #171b15;
    border-radius: 14px;
    text-align: center;
  }

  .vip-qr-logos {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 8px 0 10px;
    background: #101c12;
    border-radius: 10px;
  }

  .vip-qr-logos img {
    width: 42%;
    max-width: 175px;
    height: 76px;
    object-fit: contain;
  }

  .vip-qr-sheet h2 {
    font-size: 20px;
    letter-spacing: 1px;
    margin: 18px 0 8px;
  }

  .vip-qr-image {
    max-width: 320px;
    margin: auto;
  }

  .vip-qr-image svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .vip-qr-address {
    overflow-wrap: anywhere;
    font-size: 13px;
    font-weight: bold;
  }

  .vip-qr-sheet p:last-child {
    font-size: 12px;
  }

  .vip-qr-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 12px 0;
  }

  .vip-qr-actions button {
    padding: 12px 15px;
    cursor: pointer;
    border-radius: 9px;
    border: 1px solid #b79a62;
    background: #d9b977;
    color: #1a2117;
    font: inherit;
    font-weight: bold;
  }

  @media print {
    body {
      background: #fff !important;
    }

    #dashboard > :not(#vip-qr-panel) {
      display: none !important;
    }

    #vip-qr-panel {
      display: block !important;
      color: #111 !important;
      border: 0 !important;
      background: white !important;
      padding: 0 !important;
    }

    .vip-qr-actions,
    #vip-qr-feedback {
      display: none !important;
    }

    .vip-qr-sheet {
      max-width: 100%;
    }

    .vip-qr-image {
      width: 95mm;
      max-width: 95mm;
    }
  }
`;

document.head.append(qrStyle);

// Generate a crisp vector QR code directly in the browser
const qrNS = 'http://www.w3.org/2000/svg';
const qrSvg = document.createElementNS(qrNS, 'svg');

qrSvg.setAttribute('xmlns', qrNS);
qrSvg.setAttribute('viewBox', '0 0 37 37');
qrSvg.setAttribute('role', 'img');
qrSvg.setAttribute(
  'aria-label',
  'QR code to open the VIP Loyalty App'
);

// White background and required scanning margin
const qrWhite = document.createElementNS(qrNS, 'rect');
qrWhite.setAttribute('width', '37');
qrWhite.setAttribute('height', '37');
qrWhite.setAttribute('fill', '#fff');
qrSvg.append(qrWhite);

let qrPathData = '';

VIP_QR_ROWS.forEach((row, y) => {
  for (let x = 0; x < row.length;) {
    if (row[x] === '0') {
      x++;
      continue;
    }

    const start = x;

    while (x < row.length && row[x] === '1') {
      x++;
    }

    const length = x - start;

    qrPathData +=
      `M${start + 4} ${y + 4}h${length}v1h-${length}z`;
  }
});

const qrBlack = document.createElementNS(qrNS, 'path');
qrBlack.setAttribute('d', qrPathData);
qrBlack.setAttribute('fill', '#000');
qrSvg.append(qrBlack);

document.getElementById('vip-qr-image').append(qrSvg);

document.getElementById('vip-qr-address').textContent =
  VIP_APP_URL;

// Open the QR panel from the dashboard
qrTile.addEventListener('click', () => {
  document.getElementById('detail').hidden = true;
  qrPanel.hidden = false;

  qrPanel.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });
});

// Close the QR panel when choosing another tool
document.querySelectorAll(
  '[data-tool]:not([data-tool="qr"])'
).forEach(button => {
  button.addEventListener('click', () => {
    qrPanel.hidden = true;
  });
});

const qrFeedback =
  document.getElementById('vip-qr-feedback');

// Copy the app URL
document.getElementById('vip-qr-copy')
  .addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(VIP_APP_URL);
      qrFeedback.textContent = 'App link copied.';
    } catch {
      qrFeedback.textContent =
        'Copy the website address beneath the QR code.';
    }
  });

// Print a clean QR poster
document.getElementById('vip-qr-print')
  .addEventListener('click', () => {
    window.print();
  });

// Save the QR code as a sharp vector graphic
document.getElementById('vip-qr-save')
  .addEventListener('click', () => {
    const xml =
      new XMLSerializer().serializeToString(qrSvg);

    const blob = new Blob(
      [xml],
      { type: 'image/svg+xml;charset=utf-8' }
    );

    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = blobUrl;
    anchor.download = 'vip-app-qr.svg';

    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 30000);

    qrFeedback.textContent =
      'QR code saved as sharp, scalable SVG.';
  });
