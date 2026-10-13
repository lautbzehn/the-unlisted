/**
 * Owner notifications by email (Cloudflare Email Routing).
 * @module worker/notify
 */

/**
 * Emails the owner a plain-text copy of a submission. Best effort: the submission is already saved,
 * so a failed or unconfigured email never loses data or fails the request.
 * The recipient comes from the `NOTIFY_TO` secret, and Email Routing only delivers to verified
 * addresses, so the form cannot be used to send mail to anyone else.
 * @param {{ EMAIL?: { send(message: object): Promise<void> }, NOTIFY_TO?: string }} env
 * @param {string} subject
 * @param {string} text
 */
export async function notifyOwner(env, subject, text) {
  if (!env.EMAIL || !env.NOTIFY_TO) return;
  try {
    await env.EMAIL.send({ to: env.NOTIFY_TO, from: 'noreply@icarianforge.com', subject, text });
  } catch (error) {
    console.error('notify: email failed', error);
  }
}
