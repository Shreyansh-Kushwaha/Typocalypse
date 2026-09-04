// Keyboard layout definitions + physical-key translation.
//
// translateKey() lets someone with a QWERTY keyboard practise Dvorak/Colemak/
// AZERTY/QWERTZ: it reads the physical key (e.code) and returns the character
// that key produces in the chosen layout, honouring Shift and CapsLock.

export type LayoutKey = 'qwerty' | 'dvorak' | 'colemak' | 'azerty' | 'qwertz';

// Physical key codes for the four alphanumeric rows of a US ANSI board.
const ROW_CODES: string[][] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

export interface Layout {
  key: LayoutKey;
  name: string;
  /** what each physical row produces, unshifted - same length as ROW_CODES[i] */
  rows: string[];
  /** ...and with Shift held */
  shifted: string[];
  /** the three letter rows shown by the heatmap and the settings preview */
  heat: string[];
}

export const LAYOUTS: Layout[] = [
  {
    key: 'qwerty', name: 'QWERTY',
    rows: ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'],
    shifted: ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', 'ZXCVBNM<>?'],
    heat: ['qwertyuiop', 'asdfghjkl', "zxcvbnm,.'"],
  },
  {
    key: 'dvorak', name: 'Dvorak',
    rows: ['`1234567890[]', "',.pyfgcrl/=\\", 'aoeuidhtns-', ';qjkxbmwvz'],
    shifted: ['~!@#$%^&*(){}', '"<>PYFGCRL?+|', 'AOEUIDHTNS_', ':QJKXBMWVZ'],
    heat: ["',.pyfgcrl", 'aoeuidhtns', ';qjkxbmwvz'],
  },
  {
    key: 'colemak', name: 'Colemak',
    rows: ['`1234567890-=', 'qwfpgjluy;[]\\', "arstdhneio'", 'zxcvbkm,./'],
    shifted: ['~!@#$%^&*()_+', 'QWFPGJLUY:{}|', 'ARSTDHNEIO"', 'ZXCVBKM<>?'],
    heat: ['qwfpgjluy;', 'arstdhneio', "zxcvbkm,.'"],
  },
  {
    key: 'azerty', name: 'AZERTY',
    rows: ['²&é"\'(-è_çà)=', 'azertyuiop^$*', 'qsdfghjklmù', 'wxcvbn,;:!'],
    shifted: ['²1234567890°+', 'AZERTYUIOP¨£µ', 'QSDFGHJKLM%', 'WXCVBN?./§'],
    heat: ['azertyuiop', 'qsdfghjklm', 'wxcvbn,;:!'],
  },
  {
    key: 'qwertz', name: 'QWERTZ',
    rows: ['^1234567890ß´', 'qwertzuiopü+#', 'asdfghjklöä', 'yxcvbnm,.-'],
    shifted: ['°!"§$%&/()=?`', 'QWERTZUIOPÜ*\'', 'ASDFGHJKLÖÄ', 'YXCVBNM;:_'],
    heat: ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm,.-'],
  },
];

export const LAYOUT_KEYS = LAYOUTS.map(l => l.key);

export function getLayout(key: string): Layout {
  return LAYOUTS.find(l => l.key === key) || LAYOUTS[0];
}

/** Rows of single characters for the heatmap / preview (qwerty by default). */
export function heatRows(key: string): string[] {
  return getLayout(key).heat;
}

// code -> [unshifted, shifted] per layout, built once
const maps = new Map<LayoutKey, Map<string, [string, string]>>();
function mapFor(layout: Layout): Map<string, [string, string]> {
  let m = maps.get(layout.key);
  if (m) return m;
  m = new Map();
  ROW_CODES.forEach((codes, r) => {
    const plain = Array.from(layout.rows[r]);
    const shift = Array.from(layout.shifted[r]);
    codes.forEach((code, i) => {
      if (plain[i] != null) m!.set(code, [plain[i], shift[i] ?? plain[i]]);
    });
  });
  maps.set(layout.key, m);
  return m;
}

interface KeyLike {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  getModifierState?: (k: 'CapsLock') => boolean;
}

/**
 * Character produced by the physical key `e.code` in `layout`. Falls back to
 * e.key for unknown codes, modifier chords, and the qwerty layout itself.
 */
export function translateKey(e: KeyLike, layout: string): string {
  if (!layout || layout === 'qwerty') return e.key;
  if (e.ctrlKey || e.metaKey || e.altKey) return e.key;
  const pair = mapFor(getLayout(layout)).get(e.code);
  if (!pair) return e.key;
  const [plain, shifted] = pair;
  let caps = false;
  try { caps = !!e.getModifierState?.('CapsLock'); } catch { caps = false; }
  const isLetter = plain.toLowerCase() !== plain.toUpperCase();
  const upper = isLetter ? (e.shiftKey !== caps) : e.shiftKey;
  return upper ? shifted : plain;
}
