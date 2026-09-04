// Local word bank for the practice modes. Lives on the client so the timed
// test never needs the server (offline / PWA friendly).

export const WORDS: string[] = (
  'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or ' +
  'an will my one all would there their what so up out if about who get which go me when make can like time no just ' +
  'him know take people into year your good some could them see other than then now look only come its over think ' +
  'also back after use two how our work first well way even new want because any these give day most us is are was ' +
  'were been has had did does made said went came took gave found told left kept held met ran sat set put let got ' +
  'man woman child world life hand part eye place week case point government company number group problem fact ' +
  'night home water room mother area money story month lot right study book word business issue side kind head ' +
  'house service friend father power hour game line end member law car city community name team minute idea body ' +
  'information parent face others level office door health person art war history party result change morning ' +
  'reason research girl guy moment air teacher force education foot boy age policy process music market sense ' +
  'nation plan college interest death experience effect class control care field development role effort rate ' +
  'heart drug show leader light voice wife police mind price report decision son view relationship town road arm ' +
  'difference value building action model season society tax director position player record paper space ground ' +
  'form event official matter center couple site project activity star table court oil situation cost industry ' +
  'figure street image phone data picture practice piece land product doctor wall news test movie north love ' +
  'support technology bed church risk fire future wind south east west river mountain ocean island forest desert ' +
  'stone metal glass wood paper cloth silver gold iron salt sugar bread milk apple tree flower grass leaf root seed ' +
  'bird fish dog cat horse cow sheep wolf bear lion mouse snake frog whale spider ant bee fly moth ' +
  'run walk jump swim climb fall stand sit sleep wake eat drink cook read write draw sing dance play fight talk ' +
  'listen watch learn teach build break fix open close push pull carry drop catch throw bring send buy sell pay ' +
  'help hurt hold move turn stop start begin finish wait rest try keep leave stay follow lead grow cut join ' +
  'big small long short high low wide narrow deep thick thin heavy light fast slow hot cold warm cool wet dry ' +
  'hard soft loud quiet bright dark clean dirty early late young old rich poor strong weak safe wild calm true ' +
  'false real fresh sweet sour bitter sharp flat round square empty full open near far same other last next ' +
  'red blue green yellow black white gray brown pink orange purple ' +
  'always never often sometimes usually again already still yet soon once twice almost enough quite very too ' +
  'here there where everywhere nowhere inside outside above below under between among through across around ' +
  'before during since until while against toward without within along behind beyond beside ' +
  'answer question letter message signal number order reason story voice silence noise sound word page ' +
  'morning evening summer winter spring autumn today tomorrow yesterday tonight moment second hour ' +
  'king queen doctor farmer soldier sailor pilot driver writer artist singer captain guard nurse judge ' +
  'bridge tower castle village kitchen garden window floor roof gate wall path track field lake hill valley ' +
  'coat shirt boot glove hat ring knife fork spoon plate cup bottle box bag rope chain lamp clock bell ' +
  'radio ash ember signal drift canyon motel siren lantern hollow murmur beacon rubble scrap vault convoy ' +
  'shadow smoke dust rain snow storm thunder cloud fog frost heat flame spark ice mud sand ' +
  'ready simple secret single steady sudden usual whole free clear plain proud quick brave clever careful ' +
  'able aware certain common equal famous final human local major minor modern natural normal private public ' +
  'begin behind believe belong better between bottom bring broken cause chance choose circle count cover ' +
  'danger decide direct discover divide double doubt dream drive escape except explain express favor ' +
  'gather general gentle guess habit happen hunger imagine include instead journey lesson listen machine ' +
  'manage measure memory middle motion notice object offer period possible pressure promise prove reach ' +
  'remain remember repeat reply return search settle shape share shelter silent slide smell smile spread ' +
  'surface surprise travel trust visit wander wonder worry'
).split(/\s+/).filter((w, i, arr) => w && arr.indexOf(w) === i);

// Fragments that only appear in punctuation mode: contractions, hyphenated
// pairs, quoted words and parenthetical asides. Kept ASCII (straight quotes).
export const FRAGMENTS: string[] = [
  "don't", "can't", "won't", "isn't", "wasn't", "aren't", "weren't", "didn't", "doesn't", "hadn't",
  "haven't", "hasn't", "couldn't", "wouldn't", "shouldn't", "it's", "that's", "there's", "what's", "who's",
  "let's", "I'm", "I've", "I'll", "I'd", "you're", "you've", "you'll", "we're", "we've", "they're", "they've",
  "he's", "she's", "o'clock", "well-known", "long-term", "self-made", "so-called", "old-fashioned",
  "up-to-date", "part-time", "full-time", "twenty-one", "forty-two", "half-empty", "high-speed", "low-key",
  '"quote"', '"exactly"', '"maybe"', '"never"', '"again"', '"listen"', '"wait"', '"run"',
  '(almost)', '(again)', '(quietly)', '(later)', '(maybe)', '(once)', 'e.g.', 'i.e.', 'vs.', 'etc.',
];

export interface GenerateOptions {
  punctuation?: boolean;
  numbers?: boolean;
  /** custom rng in [0,1) for deterministic tests */
  rng?: () => number;
}

const SENTENCE_ENDERS = ['.', '.', '.', '.', '?', '!'];
const MID_PUNCT = [',', ',', ',', ';', ':'];

function capitalize(w: string): string {
  const i = w.search(/[a-z]/);
  if (i < 0) return w;
  return w.slice(0, i) + w[i].toUpperCase() + w.slice(i + 1);
}

/** Generate `count` words from the local bank. Never repeats a word back to back. */
export function generateWords(count: number, opts: GenerateOptions = {}): string[] {
  const rng = opts.rng ?? Math.random;
  const out: string[] = [];
  let last = '';
  let sinceSentence = 0; // words since the last sentence end
  let capitalizeNext = !!opts.punctuation;
  for (let i = 0; i < count; i++) {
    let w = '';
    if (opts.numbers && rng() < 0.1) {
      const digits = 2 + Math.floor(rng() * 3); // 2-4 digits
      const max = 10 ** digits;
      const min = 10 ** (digits - 1);
      w = String(min + Math.floor(rng() * (max - min)));
    } else if (opts.punctuation && rng() < 0.06) {
      w = FRAGMENTS[Math.floor(rng() * FRAGMENTS.length)];
    } else {
      do { w = WORDS[Math.floor(rng() * WORDS.length)]; } while (w === last);
    }
    last = w;

    if (opts.punctuation) {
      if (capitalizeNext) { w = capitalize(w); capitalizeNext = false; }
      sinceSentence += 1;
      const isLast = i === count - 1;
      const alreadyPunct = /[.,;:!?"]$/.test(w);
      if (!alreadyPunct) {
        if (isLast || (sinceSentence >= 4 && rng() < 0.12)) {
          w += SENTENCE_ENDERS[Math.floor(rng() * SENTENCE_ENDERS.length)];
          sinceSentence = 0;
          capitalizeNext = true;
        } else if (sinceSentence >= 2 && rng() < 0.09) {
          w += MID_PUNCT[Math.floor(rng() * MID_PUNCT.length)];
        }
      } else if (/[.!?]$/.test(w)) {
        sinceSentence = 0;
        capitalizeNext = true;
      }
    }
    out.push(w);
  }
  return out;
}
