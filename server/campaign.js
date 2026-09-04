// Campaign mode: four zones of six story nodes, each a short original
// survival passage with one or two text "mutators" that change how the
// passage is shown (fog, storm, night, ransom, blur, vanish, timebomb, mirror).
// Content and star rules live here; the routes in routes/campaign.js are thin.

export const MUTATORS = ['none', 'fog', 'storm', 'night', 'ransom', 'blur', 'vanish', 'timebomb', 'mirror'];

export const ZONES = [
  { id: 1, name: 'The Outskirts', blurb: 'Fences, fog and the first long road.' },
  { id: 2, name: 'Ruined City', blurb: 'Blackouts, ransom notes and a tower that counts down.' },
  { id: 3, name: 'The Deadwood', blurb: 'A forest that erases your steps.' },
  { id: 4, name: 'The Vault', blurb: 'Concrete, codes and the door at the end of the story.' },
];

// Each passage: plain ASCII letters, spaces, commas, periods, apostrophes; 25-45 words.
const RAW = [
  // ---------------------------------------------------------------- zone 1
  {
    zone: 1, index: 1, name: 'First Light', mutators: ['none'], targets: { accuracy: 88, wpm: 25 },
    blurb: 'The fence you swore you would never cross. Cross it.',
    text: 'The radio died at dawn and nobody came back for the mail. I packed the last of the tins, wrapped the map in plastic, and stepped over the fence I had promised never to cross again.',
  },
  {
    zone: 1, index: 2, name: 'The Fog Road', mutators: ['fog'], targets: { accuracy: 89, wpm: 27 },
    blurb: 'You can only see three words ahead. Trust the road.',
    text: 'Mist rolled off the drainage canal and ate the road ahead of me. I walked by the sound of my own boots on gravel, counting steps, trusting that the highway sign would still be there when the grey finally thinned.',
  },
  {
    zone: 1, index: 3, name: 'Farmhouse', mutators: ['blur'], targets: { accuracy: 90, wpm: 30 },
    blurb: 'Everything but the word in front of you is out of focus.',
    text: 'The farmhouse door hung on one hinge. Inside, a calendar still pointed at the week everything stopped. I filled my bottle from the rain barrel, took a coat that fit badly, and left a note in case anyone was still reading notes.',
  },
  {
    zone: 1, index: 4, name: 'Weather Warning', mutators: ['storm'], targets: { accuracy: 90, wpm: 32 },
    blurb: 'The box shakes with the storm. Every typo makes it worse.',
    text: 'Thunder walked across the fields like something with legs. I ran for the overpass as the rain came sideways, hail ringing off abandoned cars, every flash of lightning showing me the road for one white second and then taking it away.',
  },
  {
    zone: 1, index: 5, name: "Don't Look Back", mutators: ['vanish'], targets: { accuracy: 91, wpm: 34 },
    blurb: 'Typed words vanish behind you. Keep moving.',
    text: 'Something followed me out of the culvert. I never saw it, only heard the wet drag of it keeping pace, so I kept my eyes on the horizon and my feet moving. Whatever is behind you stays behind you if you never turn around.',
  },
  {
    zone: 1, index: 6, name: 'The Toll Bridge', mutators: ['fog', 'storm'], targets: { accuracy: 92, wpm: 36 }, boss: true,
    blurb: 'Fog and storm at once. Halfway is not a place you can stop.',
    text: 'The bridge keeper wanted payment and I had nothing but the story of where I was going. The storm hit as I crossed, fog and rain swallowing the far bank, the steel humming under my hands. Halfway is not a place you can stop.',
  },
  // ---------------------------------------------------------------- zone 2
  {
    zone: 2, index: 1, name: 'Blackout', mutators: ['night'], targets: { accuracy: 92, wpm: 38 },
    blurb: "Only a torch's radius of light around your caret.",
    text: 'The city had no lights left, only the glow of my cracked torch bouncing off shattered glass. Streets I once knew by their coffee shops were now canyons of silence. I moved from doorway to doorway, listening for anything that breathed.',
  },
  {
    zone: 2, index: 2, name: 'Ransom Note', mutators: ['ransom'], targets: { accuracy: 92, wpm: 40 },
    blurb: 'Letters cut from magazines. Match the case exactly.',
    text: 'Someone had pinned a letter to the pharmacy door, cut from magazine headlines. It promised medicine for anyone who reached the tower by nightfall. I read it twice, decided it was probably a trap, and started walking toward the tower anyway.',
  },
  {
    zone: 2, index: 3, name: 'Gas Leak', mutators: ['timebomb'], targets: { accuracy: 93, wpm: 42 },
    blurb: 'The clock is running. Finish before the fumes reach you.',
    text: 'The hiss started in the basement and climbed the stairwell behind me. I could smell it now, sweet and wrong. Thirty seconds to the fire exit, maybe less. I took the steps three at a time and did not breathe until the sky.',
  },
  {
    zone: 2, index: 4, name: 'Hall of Mirrors', mutators: ['mirror'], targets: { accuracy: 93, wpm: 44 },
    blurb: 'The passage is reflected. Your fingers are not.',
    text: 'The department store had been a maze even before the world ended. Now every mirror showed a stranger in my coat, moving when I moved, a heartbeat late. I found the loading dock by following the one reflection that looked frightened.',
  },
  {
    zone: 2, index: 5, name: 'Dust Storm', mutators: ['blur'], targets: { accuracy: 94, wpm: 46 },
    blurb: 'Ash blurs everything but the word you are on.',
    text: 'Ash from the burning refinery turned noon into a smeared orange dusk. I tied a wet rag over my face and read the street signs one blurry letter at a time. Somewhere in that haze was the bridge out, and the tower behind it.',
  },
  {
    zone: 2, index: 6, name: 'The Tower', mutators: ['night', 'timebomb'], targets: { accuracy: 94, wpm: 48 }, boss: true,
    blurb: 'Pitch black, and a generator counting down.',
    text: 'The tower stairwell was pitch black and the generator below was counting down to something loud. I climbed by touch, forty floors of rust and echo, my torch dead, the medicine somewhere above me and the whole building groaning like it wanted to lie down.',
  },
  // ---------------------------------------------------------------- zone 3
  {
    zone: 3, index: 1, name: 'Treeline', mutators: ['vanish'], targets: { accuracy: 95, wpm: 50 },
    blurb: 'The path closes behind you. Words vanish as you type them.',
    text: 'The forest began where the suburbs gave up. Pale trunks, no birdsong, a path that closed behind me as if the trees were shuffling into place. I marked the bark with my knife and knew already the marks would not be there tomorrow.',
  },
  {
    zone: 3, index: 2, name: 'Windfall', mutators: ['storm'], targets: { accuracy: 95, wpm: 52 },
    blurb: 'A gale rattles the text. Stay steady.',
    text: 'The gale came through the Deadwood like a freight train with nowhere to stop. Branches the size of masts came down around me. I crawled beneath a fallen oak and waited, feeling the whole hill shiver every time the sky cracked open.',
  },
  {
    zone: 3, index: 3, name: 'Carved Warnings', mutators: ['ransom'], targets: { accuracy: 95, wpm: 54 },
    blurb: 'Letters of every size. Type them as carved.',
    text: 'Someone had carved messages into the trees, letters of every size, some upside down, as if written by a hand that had forgotten how hands worked. Turn back, they said. Go around. I traced each one and kept walking straight through.',
  },
  {
    zone: 3, index: 4, name: 'The Bog', mutators: ['fog'], targets: { accuracy: 96, wpm: 56 },
    blurb: 'Fog so thick you lose your own hands.',
    text: 'The marsh breathed a fog so thick I lost my own hands in it. Each step went to the knee. I followed the ripples of something swimming ahead of me, hoping it knew the way, hoping it was not waiting for me to follow.',
  },
  {
    zone: 3, index: 5, name: 'Still Water', mutators: ['mirror'], targets: { accuracy: 96, wpm: 58 },
    blurb: 'A mirrored lake. Read the reflection.',
    text: 'A lake lay in the heart of the wood, flat as a plate and showing a sky that was not the sky above me. In the reflection the trees were green and someone stood on the far shore, waving. I did not wave back.',
  },
  {
    zone: 3, index: 6, name: 'The Hollow', mutators: ['mirror', 'vanish'], targets: { accuracy: 96, wpm: 60 }, boss: true,
    blurb: 'Mirrored and vanishing. Walk in backward.',
    text: 'At the centre of the Deadwood stood a hollow tree wide as a house, and inside it the dark moved. Every step I took erased the step before it. I walked in backward, watching the entrance shrink, until there was nothing left to watch.',
  },
  // ---------------------------------------------------------------- zone 4
  {
    zone: 4, index: 1, name: 'Airlock', mutators: ['timebomb'], targets: { accuracy: 96, wpm: 60 },
    blurb: 'State your business before the chamber vents.',
    text: 'The hollow opened onto concrete and a door that hissed when I touched it. A voice from a speaker gave me sixty seconds to state my business before the chamber vented. I said the only true thing I had. I am still here.',
  },
  {
    zone: 4, index: 2, name: 'Emergency Lighting', mutators: ['night'], targets: { accuracy: 96, wpm: 62 },
    blurb: 'Red bulbs light a few characters at a time.',
    text: 'Red bulbs flickered along a corridor that went down forever. My footsteps came back to me from rooms I could not see. Somewhere a pump was still running, keeping something alive, and I followed that heartbeat deeper into the earth.',
  },
  {
    zone: 4, index: 3, name: 'The Archive', mutators: ['ransom'], targets: { accuracy: 97, wpm: 64 },
    blurb: 'Files in scrambled capitals. Type the code exactly.',
    text: 'Shelves of paper reached the ceiling, every file typed in a code of scrambled capitals. Names, dates, the last messages of people who had reached the vault before me. I found my own name on a folder and did not open it.',
  },
  {
    zone: 4, index: 4, name: 'Observation Deck', mutators: ['blur'], targets: { accuracy: 97, wpm: 66 },
    blurb: 'Eyes watering. Only the current word is sharp.',
    text: 'Behind the glass a garden grew under artificial sun, rows of green so bright my eyes watered and refused to focus. People moved among the plants. Real people. I pressed my hand against the window and waited for someone to look up.',
  },
  {
    zone: 4, index: 5, name: 'Reactor Room', mutators: ['storm'], targets: { accuracy: 97, wpm: 68 },
    blurb: 'The whole room shakes. Keep your hands on the keys.',
    text: 'The floor shook with the turbine and warning sirens strobed the walls. A technician shouted numbers I could not hear over the roar. Every surface trembled, every handrail buzzed, and the door to the control room stood at the end of all that noise.',
  },
  {
    zone: 4, index: 6, name: 'The Vault Door', mutators: ['ransom', 'timebomb'], targets: { accuracy: 97, wpm: 70 }, boss: true,
    blurb: 'Final boss. A scrambled passphrase against a dying light.',
    text: 'The final door asked for a passphrase in scrambled letters and gave me until the lights went out to type it. I thought of the fence, the bridge, the tower, the hollow. Then I put my hands on the keys and finished the story.',
  },
];

export const wordCount = (text) => text.split(' ').filter(Boolean).length;

// Flat, ordered list. Unlocking walks this order, crossing zone boundaries.
export const NODES = RAW.map((n, i) => ({
  id: `z${n.zone}n${n.index}`,
  order: i,
  boss: !!n.boss,
  ...n,
  words: wordCount(n.text),
}));

const BY_ID = new Map(NODES.map(n => [n.id, n]));
export const MAX_STARS = NODES.length * 3;
export const nodeById = (id) => BY_ID.get(String(id)) || null;
export const nextNode = (node) => NODES[node.order + 1] || null;
export const prevNode = (node) => (node.order > 0 ? NODES[node.order - 1] : null);
export const bossOf = (zoneId) => NODES.find(n => n.zone === zoneId && n.boss) || null;

// ---------------------------------------------------------------- timebomb
export const TIMEBOMB_GRACE_MS = 1500;
export function timeLimitMs(node) {
  if (!node.mutators.includes('timebomb')) return null;
  return Math.max(20000, Math.ceil((node.words / (node.targets.wpm * 0.6)) * 60000));
}

// ---------------------------------------------------------------- ransom
// Seeded, deterministic case scramble. The client applies the identical
// transform to the plain text the server sends, so both sides agree.
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function ransomText(text, seedStr) {
  const rand = mulberry32(hashSeed(seedStr));
  let out = '';
  for (const ch of text) {
    if (/[a-z]/i.test(ch)) out += rand() < 0.4 ? ch.toUpperCase() : ch.toLowerCase();
    else out += ch;
  }
  return out;
}
// The text the player actually types (length never changes).
export const displayText = (node) => (node.mutators.includes('ransom') ? ransomText(node.text, node.id) : node.text);

// ---------------------------------------------------------------- stars
// 1 star: finished (accuracy >= 80, or inside the limit on a timebomb node)
// 2 stars: accuracy >= target
// 3 stars: also wpm >= target
export function starsFor(node, { wpm = 0, accuracy = 0, durationMs = 0 } = {}) {
  const limit = timeLimitMs(node);
  const finished = limit != null ? durationMs <= limit + TIMEBOMB_GRACE_MS : accuracy >= 80;
  if (!finished) return 0;
  if (accuracy < node.targets.accuracy) return 1;
  if (wpm < node.targets.wpm) return 2;
  return 3;
}

// ---------------------------------------------------------------- progress
export function normalizeProgress(campaign) {
  const c = campaign && typeof campaign === 'object' ? campaign : {};
  const stars = {};
  for (const [k, v] of Object.entries(c.stars || {})) {
    if (BY_ID.has(k)) stars[k] = Math.max(0, Math.min(3, Number(v) || 0));
  }
  const cleared = Array.isArray(c.cleared) ? c.cleared.filter(id => BY_ID.has(id)) : [];
  return { stars, cleared };
}
export const starsOf = (progress, id) => progress.stars[id] || 0;
export function isUnlocked(node, progress) {
  const prev = prevNode(node);
  return !prev || starsOf(progress, prev.id) >= 1;
}
export function zonesCleared(progress) {
  return ZONES.filter(z => starsOf(progress, bossOf(z.id).id) >= 1).length;
}
export const zoneCleared = (zoneId, progress) => starsOf(progress, bossOf(zoneId).id) >= 1;
export function allThreeStars(progress) {
  return NODES.every(n => starsOf(progress, n.id) === 3);
}
export function totalStars(progress) {
  return NODES.reduce((s, n) => s + starsOf(progress, n.id), 0);
}

// Public shape of a node for the map (no passage text)
export function nodeSummary(node, progress) {
  return {
    id: node.id,
    zone: node.zone,
    index: node.index,
    name: node.name,
    blurb: node.blurb,
    mutators: node.mutators,
    targets: node.targets,
    boss: node.boss,
    words: node.words,
    timeLimitMs: timeLimitMs(node),
    unlocked: isUnlocked(node, progress),
    stars: starsOf(progress, node.id),
  };
}
