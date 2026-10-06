import raw from '../data/places.json';
import { gemScore } from './scoring.js';

// While developing locally, unreviewed drafts from the research batches show up too (marked DRAFT, flags visible),
// so they can be reviewed in the real app. The public build only ever contains approved places.
const draftFiles = import.meta.env.DEV ? import.meta.glob('../../data/review/batch-*.json', { eager: true, import: 'default' }) : {};
const drafts = Object.values(draftFiles).flat().map((d) => ({ ...d, draft: true }));

// Sources and review notes stay internal: they never ship to visitors.
export const places = [...raw.filter((p) => p.status === 'approved' || p.sample), ...drafts]
  .map(({ sources, flags, status, approved, seed, osm, ...pub }) => ({
    ...pub,
    score: gemScore(pub.breakdown),
    ...(pub.draft ? { reviewFlags: flags ?? [] } : {}),
  }));

export const FAME = { 'deep-cut': 'Deep cut', 'open-secret': 'Open secret', 'local-legend': 'Local legend' };
export const WHEN = { morning: 'Morning', midday: 'Midday', evening: 'Evening', late: 'Late' };
