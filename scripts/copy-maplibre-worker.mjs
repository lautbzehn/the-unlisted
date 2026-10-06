// MapLibre 6 runs map work in a background worker made of two files that must sit side by side.
// Bundlers don't handle that reliably, so we copy them to /public/maplibre/ before dev and build.
import { mkdirSync, copyFileSync } from 'node:fs';

const from = new URL('../node_modules/maplibre-gl/dist/', import.meta.url);
const to = new URL('../public/maplibre/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(new URL(f, from), new URL(f, to));
