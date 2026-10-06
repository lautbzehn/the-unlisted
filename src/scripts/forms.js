// Shared form handling (Contact, Suggest a place, the email sign-up): invisible Cloudflare bot check, send, show the result.
const TEST_KEY = '1x00000000000000000000AA'; // Cloudflare's always-pass key, used only on this computer

// Pages with a form in their HTML load Cloudflare's script up front; the sign-up pop-up loads it only when opened.
export function loadTurnstile() {
  if (window.turnstile || document.getElementById('cf-turnstile')) return;
  const s = document.createElement('script');
  s.id = 'cf-turnstile';
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true;
  document.head.append(s);
}

// Form fields as JSON. Checkbox groups (several boxes with one name) become a list.
function fields(form) {
  const out = {};
  for (const [k, v] of new FormData(form)) {
    const many = form.querySelectorAll(`[name="${k}"][type=checkbox]`).length > 1;
    if (many) (out[k] ??= []).push(v);
    else out[k] = v;
  }
  return out;
}

export function wireForm(form, { done, onDone }) {
  const box = form.querySelector('.bot-check');
  const status = form.querySelector('.status');
  const btn = form.querySelector('button[type=submit]');
  const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };
  let widget = null;
  let waiting = null;

  (function start() {
    if (typeof window.turnstile?.render !== 'function') return setTimeout(start, 200);
    widget = window.turnstile.render(box, {
      sitekey: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? TEST_KEY : box.dataset.sitekey,
      theme: 'dark',
      appearance: 'interaction-only', // invisible unless Cloudflare needs a tap
      execution: 'execute',
      callback: (t) => { waiting?.(t); waiting = null; },
      'error-callback': () => { waiting?.(null); waiting = null; },
    });
  })();

  const token = () => new Promise((resolve) => {
    if (widget === null) return resolve(null);
    waiting = resolve;
    window.turnstile.reset(widget);
    window.turnstile.execute(widget);
    setTimeout(() => { if (waiting === resolve) { waiting = null; resolve(null); } }, 30000);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const missing = [...form.querySelectorAll('[required]')].find((el) => !el.value.trim());
    if (missing) { say('Please fill in the required field.', true); missing.focus(); return; }
    btn.disabled = true;
    say('Sending…');
    const t = await token();
    if (!t) { btn.disabled = false; say('The quick bot check didn’t finish. Please try again.', true); return; }
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields(form), token: t }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { say(out.error ?? 'Something went wrong. Try again in a minute.', true); return; }
      form.reset();
      say(done);
      onDone?.();
    } catch {
      say('Couldn’t reach the server. Check your connection and try again.', true);
    } finally {
      btn.disabled = false;
    }
  });
}
