// Time-of-day buckets, shared by the cards, the map and Surprise Me.
// Uses Bay Area time: the places are here even when the visitor isn't.
export const TIME_LABEL = { morning: 'Morning', midday: 'Midday', evening: 'Evening', late: 'Late' };

export function currentBucket(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Los_Angeles' }).format(date));
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late';
}

// 'any' -> null (no filter), 'now' -> the current bucket, otherwise the bucket itself.
export const resolveTime = (choice) => (choice === 'any' ? null : choice === 'now' ? currentBucket() : choice);
