// Builds a 1200x630 share-preview image per place at build time (no per-visitor cost),
// drawn as a passport page to match the site: midnight background, one red stamp.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { places, FAME, whenText } from '../../lib/places.js';

const font = (pkg: string, file: string) =>
  readFileSync(new URL(`../../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));
const sans = font('archivo', 'archivo-latin-400-normal.woff');
const sansBold = font('archivo', 'archivo-latin-800-normal.woff');
const serif = font('source-serif-4', 'source-serif-4-latin-400-normal.woff');

// The site's colors (src/styles/global.css).
const C = { bg: '#0c1019', raise: '#141a28', ink: '#ece7dc', mute: '#a3abbd', accent: '#e8806b', line: 'rgba(236,231,220,0.14)' };

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
  const nameSize = p.name.length > 26 ? 76 : p.name.length > 16 ? 92 : 112;
  const where = p.city === 'San Francisco' ? p.area : `${p.area}, ${p.city}`;
  const labels = [FAME[p.fame], whenText(p.when)].filter(Boolean).join(' · ');

  const tree = el('div', { width: '100%', height: '100%', background: C.bg, padding: 28 }, [
    el('div', { flex: 1, flexDirection: 'column', border: `1px solid ${C.line}`, borderRadius: 16, padding: '36px 48px', color: C.ink, fontFamily: 'Sans' }, [
      el('div', { justifyContent: 'space-between', alignItems: 'center' }, [
        el('div', { fontFamily: 'SansBold', fontSize: 28, letterSpacing: 6 }, 'THE UNLISTED'),
        el('div', { fontSize: 24, color: C.mute }, p.sample ? 'Sample, not a real place' : 'Bay Area · All hours'),
      ]),
      el('div', { flex: 1, alignItems: 'center', justifyContent: 'space-between' }, [
        el('div', { flexDirection: 'column', flex: 1, paddingRight: 48 }, [
          el('div', { fontSize: 28, color: C.mute }, clip(`${where} · ${p.kind}`, 52)),
          el('div', { fontFamily: 'SansBold', fontSize: nameSize, lineHeight: 1.02, marginTop: 10 }, p.name),
          el('div', { flexDirection: 'column', marginTop: 26, padding: '14px 20px', borderLeft: `5px solid ${C.accent}`, background: 'rgba(232,128,107,0.08)', borderRadius: '0 10px 10px 0' }, [
            el('div', { fontFamily: 'SansBold', fontSize: 22, color: C.accent }, 'Order'),
            el('div', { fontFamily: 'Serif', fontSize: 32, lineHeight: 1.3, marginTop: 2 }, clip(p.order, 78)),
          ]),
        ]),
        // the visa stamp: the Gem score
        el('div', { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 210, height: 210, borderRadius: 105, border: `4px solid ${C.accent}`, color: C.accent, transform: 'rotate(-10deg)' }, [
          el('div', { fontFamily: 'SansBold', fontSize: 20, letterSpacing: 6 }, 'GEM'),
          el('div', { fontFamily: 'SansBold', fontSize: 96, lineHeight: 1 }, String(p.score)),
          el('div', { fontFamily: 'SansBold', fontSize: 20, letterSpacing: 6 }, 'VISA'),
        ]),
      ]),
      el('div', { justifyContent: 'space-between', fontSize: 24, color: C.mute }, [
        el('div', {}, labels),
        el('div', {}, 'unlisted.icarianforge.com'),
      ]),
    ]),
  ]);

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Sans', data: sans, weight: 400, style: 'normal' },
      { name: 'SansBold', data: sansBold, weight: 800, style: 'normal' },
      { name: 'Serif', data: serif, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
