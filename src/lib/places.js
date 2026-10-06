import raw from '../data/places.json';
import { gemScore } from './scoring.js';

// Scores are never typed in by hand: they're computed from the four marks.
export const places = raw.map((p) => ({ ...p, score: gemScore(p.breakdown) }));
