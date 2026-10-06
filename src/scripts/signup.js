// The optional email sign-up pop-up.
// Shown automatically at most once per device (right after the welcome gate). "No thanks" or closing it is respected:
// after that it only opens when someone taps "Get email updates".
import { loadTurnstile, wireForm } from './forms.js';

const KEY = 'unlisted:signup'; // 'joined' | 'declined'
const dlg = document.getElementById('signup');
const form = dlg.querySelector('form');
let wired = false;

const remembered = () => { try { return localStorage.getItem(KEY); } catch { return 'unavailable'; } };
const remember = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

export function openSignup(source, { auto = false } = {}) {
  if (auto && remembered()) return;
  form.elements.source.value = source;
  form.querySelector('.status').textContent = '';
  loadTurnstile();
  if (!wired) {
    wired = true;
    wireForm(form, {
      done: 'You’re on the list. See you at the next door.',
      onDone: () => { remember('joined'); setTimeout(() => dlg.close(), 1800); },
    });
  }
  dlg.showModal();
  form.elements.email.focus();
}

dlg.addEventListener('click', (e) => {
  if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); // backdrop, ×, or "No thanks"
});
dlg.addEventListener('close', () => { if (!remembered()) remember('declined'); });

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-signup]');
  if (trigger) openSignup(trigger.dataset.signup || 'footer');
});
