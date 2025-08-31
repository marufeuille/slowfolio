async function sha256Hex(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-gate-hash]').forEach((el) => {
    const form = el.querySelector('form');
    const input = el.querySelector('input[type="password"]');
    const invalid = el.querySelector('[data-invalid]');
    const expected = (el.getAttribute('data-gate-hash') || '').toLowerCase();
    if (!form || !input || !expected) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = input.value || '';
      const digest = await sha256Hex(pass);
      if (digest === expected) {
        el.classList.add('gate--unlocked');
      } else {
        if (invalid) invalid.textContent = 'パスワードが違います';
        input.focus();
        input.select();
      }
    });
  });
});

