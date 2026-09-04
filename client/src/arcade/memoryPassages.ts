// Local passage bank for Last Words. Sorted by length at load; a session picks
// one passage from each of five escalating buckets (roughly 8 -> 45 words).

const RAW: string[] = [
  'The last radio in town still hums softly.',
  'Nobody remembers who lit the very first signal fire.',
  'We counted the cans twice and then hid the rest.',
  'Ash falls like snow but nobody is building snowmen anymore.',
  'Keep the lantern low and the door bolted until morning comes.',
  'The map is wrong now but the river still knows the way.',
  'Every night the tower blinks three times and we blink back at it.',
  'She traded her last battery for a jar of honey and never regretted it.',
  'The highway is a ribbon of rust where the convoys used to run at dawn.',
  'We planted beans in the stadium and the whole town came to watch them sprout.',
  'The children draw the old city from memory and argue about where the bakery stood.',
  'Nobody trusts the bridge after dark so we wait on the near bank and tell stories until light.',
  'The doctor keeps a ledger of every scar in the camp and reads it aloud on quiet nights like scripture.',
  'When the sirens finally stopped we did not cheer because silence in this valley has always meant something is listening.',
  'There is a working piano in the ruined hotel and on Sundays the whole camp walks two miles to hear one song.',
  'The generator coughs twice before it catches and everyone holds their breath until the bulbs glow yellow and the radio wakes up.',
  'We buried the compass with the captain because he said a good navigator never needs one and a dead one never argues.',
  'The radio operator writes every message twice, once for the log and once for the wall, so nobody can say we were not warned.',
  'Water is life so we guard the well like a queen and the old man who dug it sleeps beside it with his boots on.',
  'The library survived the fire because the librarian slept there with a bucket and a shotgun and refused to let anyone borrow the matches.',
  'Rain came on the fortieth day and we stood in the courtyard with our mouths open like fools until the cisterns overflowed and the guards laughed.',
  'The wolves came back before the people did and now they own the highway at night and we own it by day and both sides keep the treaty.',
  'Every survivor keeps one useless thing from before and mine is a train ticket to a city that is now a lake and a grandmother who lives on it.',
  'Lightning struck the water tower on the night the convoy arrived and for a moment the whole valley was lit like a stage and every face in the camp turned toward the road.',
  'The scavengers came at dusk with empty carts and full stories and by the time the fire burned down we had traded half our salt for a rumour about a working hospital in the hills.',
  'We learned to read the wind by the smell of the ash because the weather station burned in the first week and the man who could fix it walked south with the last of the fuel.',
  'The old teacher makes us recite the names of the streets every morning so that when the city is rebuilt somebody will remember where the fountain stood and which corner had the bakery with the blue door.',
  'The last broadcast from the capital was a weather report read by a man who was clearly crying and it promised clear skies for the weekend which was the first true thing anyone had told us in months.',
  'Nobody remembers the name of the town anymore but the sign at the crossroads still says welcome and every morning somebody wipes the dust from the letters so the word is the first thing a traveller sees.',
  'There is a rule in the bunker that nobody speaks during the evening broadcast because the signal is weak and the voice on the other end might be the last person left who still knows how to say our names.',
  'On the anniversary of the fall we climb the ridge and light one candle for every person we lost and one more for the stranger who left the crates of medicine at the gate and never came back to be thanked.',
  'My mother taught me to type on a machine older than the war and when the lights went out she said that hands which remember the keys will always have something to say even in a world that has stopped listening.',
  'The engineer says the dam will hold for another winter if we clear the debris from the spillway and nobody asks what happens after that because in this valley one more winter has always been the most anybody dared to hope for.',
  'We keep the seeds in a locked tin under the floor of the chapel and once a year we open it and count them out loud so the children know that the future has a number and the number is growing.',
];

export interface Passage { text: string; words: number }

export const MEMORY_PASSAGES: Passage[] = RAW
  .map(text => ({ text, words: text.split(/\s+/).length }))
  .sort((a, b) => a.words - b.words);

export const ROUNDS = 5;

/** One passage per escalating bucket, never the same passage twice in a session. */
export function pickMemorySession(): Passage[] {
  const per = Math.ceil(MEMORY_PASSAGES.length / ROUNDS);
  const picks: Passage[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    const bucket = MEMORY_PASSAGES.slice(r * per, (r + 1) * per).filter(p => !picks.includes(p));
    const pool = bucket.length ? bucket : MEMORY_PASSAGES;
    picks.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return picks;
}
