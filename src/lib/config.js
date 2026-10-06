// Public settings. The Turnstile *site* key is meant to be public; its secret lives only on Cloudflare.
// Widget "The Unlisted" (managed mode), allowed on unlisted.icarianforge.com only.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFO26rq2KgernOgc';

// The welcome gate's background video (15 to 30 seconds, muted, loops). Leave null until it exists,
// e.g. { src: '/video/gate.mp4', poster: '/video/gate.jpg' }.
export const GATE_VIDEO = null;
