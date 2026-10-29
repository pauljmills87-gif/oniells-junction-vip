/* O'Neills & Junction VIP — Android-only home-screen height fix.
   Keeps the original approved home artwork and venue-button hit areas together.
   Does not run on iPhones/iPads, and does not alter login, card, or admin pages.
*/
(() => {
  'use strict';

  if (!/Android/i.test(navigator.userAgent)) return;

  const css = `
    @media (max-width: 539px) {
      #home-screen:not(.is-hidden) {
        display: flex;
        align-items: stretch;
        justify-content: center;
        height: 100vh;
        height: 100dvh;
        min-height: 100vh;
        min-height: 100dvh;
        overflow: hidden;
      }

      #home-screen .home-artwork {
        position: relative;
        width: 100%;
        height: 100vh;
        height: 100dvh;
        max-width: none;
        flex: 0 0 100%;
        overflow: hidden;
      }

      #home-screen .home-artwork > img {
        display: block;
        width: 100%;
        height: 100%;
        max-height: none;
        object-fit: fill;
      }
    }
  `;

  const sheet = document.createElement('style');
  sheet.id = 'vip-android-screen-fit';
  sheet.textContent = css;
  document.head.appendChild(sheet);
})();
