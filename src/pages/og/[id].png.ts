// Builds a 1200x630 share-preview image per place at build time (no per-visitor cost), in the v2.0 look:
// the place's name hung as its neon sign (lib/neon.js, the same one as on its page) on a black wall,
// with where it is, the one-line why, and the Gem score as a cold bar.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { places, FAME, METROS, whereText } from '../../lib/places.js';
import { neonFor } from '../../lib/neon.js';

const font = (pkg: string, file: string) =>
  readFileSync(new URL(`../../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));
const display = font('instrument-serif', 'instrument-serif-latin-400-normal.woff');
const displayItalic = font('instrument-serif', 'instrument-serif-latin-400-italic.woff');
const thin = font('inter', 'inter-latin-200-normal.woff');
const sans = font('inter', 'inter-latin-400-normal.woff');
const mono = font('ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff');

// The site's colors (src/styles/tokens.css).
const C = { bg: '#000000', ink: '#f4f1ea', mute: '#a6a29a', faint: '#7e7a73', line: 'rgba(244,241,234,0.14)', red: '#ff4636', cold: '#8fe3ff' };
const TUBE = { red: { c: C.red, core: '#ffe4df', wall: 'rgba(255,70,54,0.16)' }, cold: { c: C.cold, core: '#effcff', wall: 'rgba(143,227,255,0.13)' } };

export function getStaticPaths() {
  return places.map((place) => ({ params: { id: place.id }, props: { place } }));
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const GET: APIRoute = async ({ props }) => {
  const p = props.place as (typeof places)[number];
  const neon = neonFor(p.id, p.name);
  const tube = TUBE[neon.tone];
  const len = [...p.name].length;
  // As big as the line allows: script letters are narrow, block capitals are wide and tracked
  const size = neon.face === 'script' ? Math.min(150, Math.round(2300 / len)) : Math.min(104, Math.round(1500 / len));
  const mono14 = { fontFamily: 'Mono', fontSize: 20, letterSpacing: 3, color: C.mute };

  const tree = el('div', {
    width: '100%', height: '100%', flexDirection: 'column', padding: '40px 56px', color: C.ink, fontFamily: 'Sans',
    backgroundColor: C.bg, backgroundImage: `radial-gradient(ellipse 60% 55% at 50% 46%, ${tube.wall}, transparent 70%)`,
  }, [
    el('div', { justifyContent: 'space-between', alignItems: 'center' }, [
      el('div', { alignItems: 'center' }, [
        el('div', { width: 12, height: 12, borderRadius: 6, backgroundColor: C.red, marginRight: 14, boxShadow: `0 0 14px ${C.red}` }),
        el('div', { fontFamily: 'Display', fontSize: 40 }, 'The Unlisted'),
      ]),
      el('div', mono14, (p.sample ? 'SAMPLE, NOT A REAL PLACE' : `${METROS[p.metro]?.name ?? 'Bay Area'} · ${FAME[p.fame] ?? ''}`).toUpperCase()),
    ]),
    // the sign
    el('div', { flex: 1, alignItems: 'center', justifyContent: 'center', padding: '0 20px' }, [
      el('div', {
        fontFamily: neon.face === 'script' ? 'DisplayItalic' : 'Thin', fontSize: size, lineHeight: 1.05, textAlign: 'center', justifyContent: 'center',
        letterSpacing: neon.face === 'block' ? size * 0.1 : -1, color: tube.core, transform: `rotate(${neon.tilt}deg)`,
        // two glows only: each wider blur costs the renderer seconds per image; the wall's gradient makes the wide halo
        textShadow: `0 0 4px ${tube.c}, 0 0 16px ${tube.c}`,
      }, neon.face === 'block' ? p.name.toUpperCase() : p.name),
    ]),
    el('div', { justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 22, borderTop: `1px solid ${C.line}` }, [
      el('div', { flexDirection: 'column', flex: 1, paddingRight: 48 }, [
        el('div', mono14, clip(`${whereText(p)} · ${p.kind}`, 56).toUpperCase()),
        p.tagline ? el('div', { fontSize: 32, marginTop: 10, letterSpacing: -0.5 }, clip(p.tagline, 60)) : null,
      ]),
      el('div', { flexDirection: 'column', alignItems: 'flex-end', width: 250 }, [
        el('div', { alignItems: 'flex-end' }, [
          el('div', { ...mono14, marginRight: 14, marginBottom: 12 }, 'GEM'),
          el('div', { fontFamily: 'Display', fontSize: 84, lineHeight: 0.9, color: C.cold }, String(p.score)),
        ]),
        el('div', { width: 250, height: 3, marginTop: 14, backgroundColor: C.line }, [
          el('div', { width: `${p.score}%`, height: 3, backgroundColor: C.cold, boxShadow: `0 0 12px ${C.cold}` }),
        ]),
      ]),
    ]),
  ]);

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Display', data: display, weight: 400, style: 'normal' },
      { name: 'DisplayItalic', data: displayItalic, weight: 400, style: 'normal' },
      { name: 'Thin', data: thin, weight: 400, style: 'normal' },
      { name: 'Sans', data: sans, weight: 400, style: 'normal' },
      { name: 'Mono', data: mono, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
