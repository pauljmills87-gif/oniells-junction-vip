/* Secure administrator sign-in. Passwords go only to /api/admin-login. */
(() => {
  'use strict';
  const form = document.getElementById('admin-login-form');
  const email = document.getElementById('admin-email');
  const password = document.getElementById('admin-password');
  const button = document.getElementById('admin-submit');
  const message = document.getElementById('admin-message');
  const success = document.getElementById('login-success');
  const successDetail = document.getElementById('success-detail');
  const show = document.getElementById('show-password');
  let busy = false;

  show.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    show.textContent = visible ? 'Hide' : 'Show';
    show.setAttribute('aria-pressed', String(visible));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!email.validity.valid || !password.value) {
      message.textContent = 'Please enter a valid email address and password.';
      return;
    }
    busy = true;
    button.disabled = true;
    message.textContent = 'Verifying administrator account…';
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'same-origin',
        body: JSON.stringify({email: email.value.trim(), password: password.value})
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        password.value = '';
        message.textContent = data.error || 'Sign-in failed. Please try again.';
        return;
      }
      password.value = '';
      form.hidden = true;
      message.textContent = '';
      successDetail.textContent = `Signed in as ${data.role === 'owner' ? 'Owner' : 'Manager'}.`;
      success.hidden = false;
    } catch {
      password.value = '';
      message.textContent = 'Could not reach the login service. Try again.';
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
})();
