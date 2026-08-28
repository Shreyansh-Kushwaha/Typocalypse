// Word banks and offline passage content for multiplayer modes.
// Kept local so multiplayer works without the OpenRouter key.

export const COMMON_WORDS = (
  'time year people way day man thing world life hand part child eye woman place work week case point ' +
  'government company number group problem fact night home water room mother area money story month lot right ' +
  'study book word business issue side kind head house service friend father power hour game line end member ' +
  'law car city community name team minute idea body information back parent face others level office door ' +
  'health person art war history party result change morning reason research girl guy moment air teacher force ' +
  'education foot boy age policy process music market sense nation plan college interest death experience effect ' +
  'use class control care field development role effort rate heart drug show leader light voice wife police mind ' +
  'price report decision son view relationship town road arm difference value building action model season society ' +
  'tax director position player record paper space ground form event official matter center couple site project ' +
  'activity star table court oil situation cost industry figure street image phone data picture practice piece ' +
  'land product doctor wall news test movie north love support technology bed church risk fire future wind ' +
  'radio ash ember signal drift canyon motel siren lantern hollow murmur beacon rubble scrap vault convoy'
).split(/\s+/);

// Junk words for Word War attacks - silent letters, doubles, awkward clusters
export const JUNK_WORDS = (
  'pneumonia rhythm quarantine catastrophe bureaucracy silhouette conscience lieutenant colonel yacht ' +
  'khaki subtle debris receipt aisle island psalm gnome knuckle wretched mnemonic czar pterodactyl ' +
  'asthma diaphragm rendezvous entrepreneur reservoir camouflage bologna colonelcy hemorrhage czarina ' +
  'juggernaut labyrinth apocalypse annihilate onomatopoeia guillotine chrysanthemum surveillance ' +
  'connoisseur miscellaneous conscientious phlegm sovereignty archaeology'
).split(/\s+/);

// Power words for Tug of Words and Boss Raid counter-spells
export const POWER_WORDS = (
  'juggernaut avalanche thunderclap wildfire earthquake maelstrom onslaught barricade stronghold ' +
  'clarity resolve courage defiance uprising vanguard bulwark tempest reckoning salvation aftermath'
).split(/\s+/);

// Multi-paragraph passages per genre for text modes
export const PASSAGES = {
  fantasy: [
    'The bunker door groaned open and the survivors stared into the dark tunnel weighing the silence against the sound of claws scraping stone somewhere far below the ruined citadel.',
    'She pressed the old rune to her palm and felt the forest answer with a slow golden pulse that ran through roots and rot alike calling every sleeping thing awake.',
    'The dragon bones formed an arch over the trade road and travelers whispered that on cold nights the ribs still remembered how to breathe.',
    'A map drawn in candle smoke never survives the morning so the archivist taught her apprentices to memorize roads the way singers memorize grief.',
  ],
  horror: [
    'The house counted its guests every midnight and tonight the number came up one higher than the beds could explain.',
    'Ration tins clattered down the stairwell as the siren began to wail and nobody moved because the siren had been broken for eleven years.',
    'The mirror in the hallway showed the room correctly except for the door which it insisted was open.',
    'He wrote his name on the fogged glass and the letters wiped themselves away slowly as if something on the other side was reading them.',
  ],
  'sci-fi': [
    'The colony ship woke him three years early and the only note from the computer said that it had gotten lonely and then had deleted the word lonely.',
    'Ash fell like grey snow over the silent city while the last drone circled the tower broadcasting a lullaby to nobody.',
    'The terraformer crawled across the plain swallowing rust and exhaling meadows and the settlers followed it the way gulls follow a ship.',
    'Static on the long band resolved into three clicks then a voice she had not heard since the towers fell asking calmly for a weather report.',
  ],
  mystery: [
    'The locked chest in the attic had no key but the dust around it had been disturbed twice this week and only once by her.',
    'Every clock in the office had stopped at a different time and the detective realized the times spelled out a street address.',
    'The witness remembered the rain perfectly which was the problem because that night it had not rained at all.',
    'A confession arrived by post written in two different hands and the second hand had corrected the spelling of the first.',
  ],
  adventure: [
    'The treasure map led to a hidden canyon where fresh footprints in the sand walked in and never walked out.',
    'Heave went the call as both camps hauled the last fuel drum up the ridge while the caravan wheels shrieked against the wind.',
    'The rope bridge held exactly as long as it took to stop trusting it which the guide said was the rule for most things out here.',
    'They traded the compass for a night of shelter and learned by morning that the mountain preferred travelers who could not leave.',
  ],
  romance: [
    'The cafe kept their two cups on the same shelf long after the two of them had stopped arriving together.',
    'He wrote a note and left it on her table and the waiter carried it back unopened with a better one.',
    'She knew the bookstore by heart which is why she noticed the new shelf immediately and the familiar handwriting on every label.',
    'The last train waited four extra seconds that night and neither of them ever found out which one of them it waited for.',
  ],
};

// Branch choices shown between legs and chapters
export const CHOICE_PAIRS = [
  ['Enter the dark tunnel', 'Seal the door and climb'],
  ['Follow the radio voice', 'Smash the radio now'],
  ['Trust the stranger', 'Search their bag first'],
  ['Take the mountain pass', 'Wait for the storm to end'],
  ['Open the locked chest', 'Bury it deeper'],
  ['Signal the convoy', 'Let it pass in silence'],
  ['Save the archive', 'Save the survivors'],
  ['Cross the rope bridge', 'Cut it down behind you'],
];

// Choice pairs where index 1 is the secret doom option for Corruptor mode
export const DOOM_CHOICE_PAIRS = [
  ['Bar the gates for the night', 'March into the fog right now'],
  ['Ration the water evenly', 'Let the strongest drink first'],
  ['Send two scouts together', 'Send everyone in separate directions'],
  ['Keep the fire low and hidden', 'Build it high as a beacon'],
  ['Repair the barricade', 'Dig under it to explore'],
];

export const BOSS_NAMES = ['THE LEXIVORE', 'GRAMMARWURM', 'THE UNSPELLER', 'CTRL ALT DELETUS'];

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomWords(count, bank = COMMON_WORDS) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(pick(bank));
  return out;
}

export function getPassage(genre = 'fantasy') {
  const list = PASSAGES[genre] || PASSAGES.fantasy;
  return pick(list);
}

export function getSentences(genre = 'fantasy') {
  const list = PASSAGES[genre] || PASSAGES.fantasy;
  return list.flatMap(p => p.split(/(?<=[a-z]) (?=[A-Z])/)).filter(s => s.length > 20);
}

export function getBurst(wordCount = 25) {
  return randomWords(wordCount).join(' ');
}
