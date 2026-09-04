// Local word bank for Meteor Shower - the game must play without the server.

const RAW =
  // 3 letters
  'the and for are but not you all any can had her was one our out day get has him his how man new now old see two way who ' +
  'boy did its let put say she too use sky ash war run hit dig fog mud ice bag box cup key map jar oil pen pit rag rat ' +
  // 4 letters
  'time year work life hand part home word room fact book side kind head door line road city name idea body face hour ' +
  'game rest fire wind rain snow dust bone iron wall gate camp fuel food hope fear dark cold heat lost gone last next ' +
  'open shut lock rust salt seed soil root leaf tree rock sand hill lake pond ship boat mast rope wire tool nail bolt ' +
  'gear pump tank tent bunk desk lamp moon star dawn dusk mist echo ruin moss vine cart flag drum bell horn crow hawk ' +
  // 5 letters
  'world place point night water money story month right study group thing house power voice light music heart earth ' +
  'stone metal smoke steam flame ember storm cloud frost blaze shell blast siege guard watch alarm radio radar tower ' +
  'field crate wagon truck train track river ridge cliff ghost skull crypt grave shade flare torch spark knife blade ' +
  'sword armor chain steel brick glass paper flour bread sugar honey candy apple berry grain crops ashes drift comet ' +
  'orbit ruins vault siren rifle medic scout timer valve diesel canal marsh swamp gorge slope crest north south ' +
  // 6 letters
  'people number system school family mother father friend health change moment reason result nation market office ' +
  'rescue shield bunker rubble scraps convoy signal static beacon canyon bridge hollow murmur ration supply harbor ' +
  'tunnel ladder engine cannon rocket meteor planet shadow winter summer spring autumn breeze vortex plasma silent ' +
  'broken hidden frozen burned ruined sealed locked buried embers cinder crater desert island forest jungle glacier ' +
  // 7 letters
  'morning history company problem service country program student teacher village shelter fortify caravan lantern ' +
  'outpost thunder gravity horizon citadel remnant crimson ashfall descent barrier blister freight furnace harvest ' +
  'compass grenade warhead capsule reactor volcano tsunami eclipse fallout salvage rations bandage lookout campfire ' +
  // 8 letters
  'building question research industry practice survivor sentinel scavenge doomsday asteroid darkness blackout ' +
  'shutdown hardware downfall wreckage collapse evacuate quarters sandbags flashlight watchman ambulance airstrip';

export const WORDS: string[] = [...new Set(RAW.split(/\s+/).filter(Boolean))];

/** Long words worth double points - they appear from wave 3 onward. */
export const BOSS_WORDS: string[] = [
  'apocalypse', 'catastrophe', 'annihilation', 'juggernaut', 'quarantine', 'thunderstorm', 'extinction',
  'devastation', 'obliteration', 'wasteland', 'radiation', 'cataclysm', 'bombardment', 'firestorm',
  'aftermath', 'graveyard', 'stronghold', 'barricade', 'meteorite', 'incineration',
];

/** Typing one of these heals the bunker. */
export const REPAIR_WORDS: string[] = ['repair', 'patch', 'mend', 'weld', 'brace', 'fortify', 'rebuild', 'shield'];

/** One per wave - typing it slows the whole sky for a few seconds. */
export const SLOW_WORDS: string[] = ['slow', 'freeze', 'stall', 'pause', 'halt', 'linger', 'suspend'];

export function wordsOfLength(min: number, max: number): string[] {
  const hits = WORDS.filter(w => w.length >= min && w.length <= max);
  return hits.length ? hits : WORDS;
}
