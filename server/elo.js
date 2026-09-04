// Elo rating for rated duels. scoreA is 1 for an A win, 0 for a loss, 0.5 for a draw.
// Deltas are rounded so ratings stay integers; ratings never drop below the floor.

const RATING_FLOOR = 100;

export function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

export function elo(ra, rb, scoreA, k = 32) {
  const a0 = Number(ra) || 1000;
  const b0 = Number(rb) || 1000;
  const s = Math.max(0, Math.min(1, Number(scoreA)));
  const ea = expectedScore(a0, b0);
  const eb = 1 - ea;
  let deltaA = Math.round(k * (s - ea));
  let deltaB = Math.round(k * ((1 - s) - eb));
  const a = Math.max(RATING_FLOOR, a0 + deltaA);
  const b = Math.max(RATING_FLOOR, b0 + deltaB);
  deltaA = a - a0;
  deltaB = b - b0;
  return { a, b, deltaA, deltaB };
}

// Tier label shown next to a rating (mirrored on the client)
export function tierOf(rating) {
  if (rating < 900) return 'Scrap';
  if (rating < 1100) return 'Survivor';
  if (rating < 1300) return 'Raider';
  if (rating < 1500) return 'Warlord';
  return 'Apocalypse';
}
