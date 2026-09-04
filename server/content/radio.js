// Radio Transmissions sentence bank. Plain ASCII, no quotes - these are read
// aloud by the browser's speech synthesis and typed back from memory.
// difficulty 1 = short and common words, 2 = medium, 3 = long or rare words.

const L = (difficulty, text) => ({ difficulty, text });

export const RADIO_LINES = [
  // ---- difficulty 1: short survivor chatter
  L(1, 'This is Outpost Seven, we are still alive'),
  L(1, 'Supply drop at the old school at dawn'),
  L(1, 'Storm coming from the north, seal the doors'),
  L(1, 'Water is safe to drink after ten minutes of boiling'),
  L(1, 'Do not cross the bridge after dark'),
  L(1, 'We have room for six more at the church'),
  L(1, 'Fuel truck spotted on highway nine heading east'),
  L(1, 'Radio check, anyone out there, over'),
  L(1, 'Stay off the main road tonight, over'),
  L(1, 'The east gate is open until sunset'),
  L(1, 'Meet at the water tower at first light'),
  L(1, 'We found dry beds and a working stove'),
  L(1, 'Bring salt if you have it, we are out'),
  L(1, 'The mill is clear, repeat, the mill is clear'),
  L(1, 'Two survivors on foot, both need boots'),
  L(1, 'The signal fades after midnight, send early'),
  L(1, 'Green flag on the roof means safe to land'),
  L(1, 'No power in the valley since Tuesday'),
  L(1, 'We hear you, hold your position'),
  L(1, 'Keep the fire low and the voices lower'),
  // ---- difficulty 2: coordinates, weather, logistics
  L(2, 'Grid reference four seven north by twelve east, medical tent standing'),
  L(2, 'Wind shifting to the west at twenty knots, expect ash before noon'),
  L(2, 'Convoy of three trucks leaving the depot at zero six hundred, one seat open'),
  L(2, 'Marker flare at the reservoir means the pumps are running again'),
  L(2, 'Twelve cases of tinned peaches traded for a working generator'),
  L(2, 'Heavy rain expected through Thursday, move the batteries to high ground'),
  L(2, 'Beacon eleven is silent, send a runner before the next cycle'),
  L(2, 'Patrol found tracks near the orchard, keep the children inside'),
  L(2, 'Antenna repaired on the north tower, range is back to forty miles'),
  L(2, 'Whoever is broadcasting on channel nine, please lower your volume'),
  L(2, 'Doctor Reyes needs insulin, any pharmacy still standing please respond'),
  L(2, 'Crossing at the rail yard is flooded, take the tunnel under the mill'),
  L(2, 'Solar panels on the library roof, bring a ladder and a friend'),
  L(2, 'Quiet hours begin at dusk, no engines and no music until morning'),
  L(2, 'Temperature dropping below freezing tonight, share the blankets'),
  L(2, 'The greenhouse tomatoes came in, first pick goes to the night shift'),
  L(2, 'Lost a dog named Pepper near the canal, brown with one white ear'),
  L(2, 'Ferry runs twice a day now, sunrise and sunset, no exceptions'),
  L(2, 'Fresh graffiti on the overpass says the tunnel is not safe'),
  L(2, 'Convoy delayed by a fallen crane, revised arrival is tomorrow evening'),
  // ---- difficulty 3: long, rarer vocabulary
  L(3, 'Meteorological station reports barometric pressure collapsing rapidly, secure all exterior equipment immediately'),
  L(3, 'Coordinates for the underground reservoir are latitude thirty nine point four, longitude one hundred four point nine'),
  L(3, 'Quarantine perimeter extended to the abandoned cannery, anyone inside must report symptoms to the infirmary'),
  L(3, 'Helicopter resupply cancelled due to volcanic particulates, expect a ground convoy within seventy two hours'),
  L(3, 'The hydroelectric turbine is operational again, rationing schedule revised to alternating evenings'),
  L(3, 'Seismic activity detected beneath the northern ridge, evacuate the tunnels and count every person twice'),
  L(3, 'Emergency frequency compromised, switch to the alternate channel and authenticate with the phrase lantern harvest'),
  L(3, 'Archivist requests volunteers to catalogue the recovered pharmaceutical inventory before it deteriorates'),
  L(3, 'Unidentified aircraft circling the observatory since midnight, extinguish all lights and hold your transmissions'),
  L(3, 'Reconnaissance team confirms the highway viaduct is structurally unsound, reroute through the agricultural district'),
  L(3, 'Rainwater collection exceeded projections, the desalination unit can be powered down for maintenance'),
  L(3, 'Whoever repaired the lighthouse generator, the harbormaster is grateful and the harbour is grateful'),
  L(3, 'Provisional council convenes at the amphitheatre tomorrow, bring your ration ledgers and your grievances'),
  L(3, 'Atmospheric interference will intensify this evening, transmit essential coordinates before sunset'),
  L(3, 'Veterinarian needed at the northern pasture, three horses showing symptoms of contaminated feed'),
  L(3, 'Radiation readings along the riverbank have stabilised, fishing may resume beyond the second buoy'),
  L(3, 'Orbital debris expected to re-enter over the peninsula, observe the sky and stay clear of the shoreline'),
  L(3, 'Telegraph wire salvaged from the museum has been strung to the water tower, expect clearer reception'),
  L(3, 'Cartographers finished mapping the flooded subway, copies available at the library reading room'),
  L(3, 'Beware the counterfeit distress calls from the marina, the frequency has been hijacked by scavengers'),
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 10 lines ramping 1 -> 3 (3 easy, 4 medium, 3 hard), never repeating within a session.
export function pickRadioSession() {
  const shape = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];
  const pools = { 1: shuffle(RADIO_LINES.filter(l => l.difficulty === 1)), 2: shuffle(RADIO_LINES.filter(l => l.difficulty === 2)), 3: shuffle(RADIO_LINES.filter(l => l.difficulty === 3)) };
  return shape.map((d, i) => {
    const line = pools[d].pop() || pools[2].pop() || pools[1].pop() || RADIO_LINES[i];
    return { id: RADIO_LINES.indexOf(line), text: line.text, difficulty: line.difficulty };
  });
}
