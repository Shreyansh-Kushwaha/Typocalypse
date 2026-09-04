// Offline subset of the server radio bank (server/content/radio.js) so the
// mode still plays when the fetch fails.

export interface RadioLine { id: number; text: string; difficulty: number }

const L = (id: number, difficulty: number, text: string): RadioLine => ({ id, difficulty, text });

export const RADIO_FALLBACK: RadioLine[] = [
  L(1000, 1, 'This is Outpost Seven, we are still alive'),
  L(1001, 1, 'Supply drop at the old school at dawn'),
  L(1002, 1, 'Storm coming from the north, seal the doors'),
  L(1003, 1, 'Do not cross the bridge after dark'),
  L(1004, 1, 'Meet at the water tower at first light'),
  L(1005, 2, 'Grid reference four seven north by twelve east, medical tent standing'),
  L(1006, 2, 'Wind shifting to the west at twenty knots, expect ash before noon'),
  L(1007, 2, 'Convoy of three trucks leaving the depot at zero six hundred, one seat open'),
  L(1008, 2, 'Antenna repaired on the north tower, range is back to forty miles'),
  L(1009, 2, 'Crossing at the rail yard is flooded, take the tunnel under the mill'),
  L(1010, 3, 'Meteorological station reports barometric pressure collapsing rapidly, secure all exterior equipment immediately'),
  L(1011, 3, 'Quarantine perimeter extended to the abandoned cannery, anyone inside must report symptoms to the infirmary'),
  L(1012, 3, 'Seismic activity detected beneath the northern ridge, evacuate the tunnels and count every person twice'),
  L(1013, 3, 'Emergency frequency compromised, switch to the alternate channel and authenticate with the phrase lantern harvest'),
  L(1014, 3, 'Reconnaissance team confirms the highway viaduct is structurally unsound, reroute through the agricultural district'),
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Same 3 / 4 / 3 ramp the server uses. */
export function pickFallbackSession(): RadioLine[] {
  const shape = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];
  const pools: Record<number, RadioLine[]> = {
    1: shuffle(RADIO_FALLBACK.filter(l => l.difficulty === 1)),
    2: shuffle(RADIO_FALLBACK.filter(l => l.difficulty === 2)),
    3: shuffle(RADIO_FALLBACK.filter(l => l.difficulty === 3)),
  };
  return shape.map((d, i) => pools[d].pop() || pools[2].pop() || pools[1].pop() || RADIO_FALLBACK[i]);
}
