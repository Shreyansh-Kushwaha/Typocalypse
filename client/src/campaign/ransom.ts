// Deterministic case scramble for the `ransom` mutator. Mirrors
// server/campaign.js exactly (same hash, same PRNG, same threshold) so the
// text the player types is stable per node and the server can trust its length.

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ransomText(text: string, seedStr: string): string {
  const rand = mulberry32(hashSeed(seedStr));
  let out = '';
  for (const ch of text) {
    if (/[a-z]/i.test(ch)) out += rand() < 0.4 ? ch.toUpperCase() : ch.toLowerCase();
    else out += ch;
  }
  return out;
}
