import raw from '../data/places.json';
import { gemScore } from './scoring.js';

// Only approved places reach the site. Sources and review flags stay internal: they never ship to visitors.
export const places = raw
  .filter((p) => p.status === 'approved' || p.sample)
  .map(({ sources, flags, status, approved, seed, osm, ...pub }) => ({ ...pub, score: gemScore(pub.breakdown) }));

export const FAME = { 'deep-cut': 'Deep cut', 'open-secret': 'Open secret', 'local-legend': 'Local legend' };
export const WHEN = { morning: 'Morning', midday: 'Midday', evening: 'Evening', late: 'Late' };
