/* Hidden administrator entrance: five taps on the gold VIP title in 3 seconds. */
(() => {
  'use strict';
  const artwork = document.querySelector('#home-screen .home-artwork');
  if (!artwork) return;

  // The gold VIP lettering lives in this region of the original portrait artwork.
  const hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.setAttribute('aria-label', 'Administrator sign-in: activate five times');
  hotspot.title = '';
  hotspot.style.cssText = [
    'position:absolute', 'top:8.7%', 'left:22%', 'width:56%', 'height:14.8%',
    'border:0', 'padding:0', 'background:transparent', 'z-index:3',
    'touch-action:manipulation', '-webkit-tap-highlight-color:transparent'
  ].join(';');
  artwork.appendChild(hotspot);

  let count = 0;
  let startedAt = 0;
  hotspot.addEventListener('click', () => {
    const now = Date.now();
    if (now - startedAt > 3000) {
      count = 0;
      startedAt = now;
    }
    count += 1;
    if (count === 5) {
      count = 0;
      window.location.assign('/admin.html');
    }
  });
})();
