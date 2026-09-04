// Player settings: cosmetics (theme / caret / sound pack), typography, motion,
// keyboard layout, volume. Persisted in localStorage `typo-settings`, applied
// to <html> before first paint, and synced with the server locker for
// logged-in users (POST /progression/equip; the server wins on load).
//
//   const { settings, update, open } = useSettings();
//   getSettingsSnapshot()  - non-React read (used by the typing engine)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { setSoundPack, setVolume } from '../sound';

export type FontKey = 'mono' | 'sans' | 'serif' | 'dyslexic';
export type LayoutKey = 'qwerty' | 'dvorak' | 'colemak' | 'azerty' | 'qwertz';

export interface Settings {
  theme: string;
  caret: string;
  sound: string;
  font: FontKey;
  fontSize: number; // 0.85 | 1 | 1.15 | 1.3
  reducedMotion: boolean;
  layout: LayoutKey;
  emulateLayout: boolean;
  highContrast: boolean;
  soundVolume: number; // 0..1
}

export interface CatalogItem {
  key: string;
  name: string;
  blurb: string;
  unlock: { level?: number; achievement?: string };
  dark?: boolean;
  preview?: string[];
}
export interface CatalogAchievement { key: string; name: string; icon: string; description: string; xp: number }
export interface Catalog { themes: CatalogItem[]; carets: CatalogItem[]; sounds: CatalogItem[]; achievements: CatalogAchievement[] }
export type LockerItem = CatalogItem & { unlocked: boolean };
export interface Locker {
  themes: LockerItem[];
  carets: LockerItem[];
  sounds: LockerItem[];
  equipped: { theme: string; caret: string; sound: string; title: string };
}

export const FONT_KEYS: FontKey[] = ['mono', 'sans', 'serif', 'dyslexic'];
export const FONT_SIZES = [0.85, 1, 1.15, 1.3];
export const LAYOUT_KEYS: LayoutKey[] = ['qwerty', 'dvorak', 'colemak', 'azerty', 'qwertz'];

const STORAGE_KEY = 'typo-settings';
const CATALOG_KEY = 'typo-catalog';

// Mirrors THEMES in server/progression.js so the first paint is right before the catalog loads.
export const FALLBACK_THEMES: CatalogItem[] = [
  { key: 'brutal', name: 'Brutal', blurb: 'Paper, ink, and a pink shadow. The original.', unlock: {}, dark: false, preview: ['#f4f4f0', '#000000', '#ff007f'] },
  { key: 'midnight', name: 'Midnight', blurb: 'Black on black with a yellow warning stripe.', unlock: { level: 2 }, dark: true, preview: ['#000000', '#facc15', '#ffffff'] },
  { key: 'paper', name: 'Old Paper', blurb: 'Sepia and soot, like a survivor journal.', unlock: { level: 3 }, dark: false, preview: ['#efe6cf', '#2b1d0e', '#b45309'] },
  { key: 'ember', name: 'Ember', blurb: 'The city is still burning.', unlock: { level: 5 }, dark: true, preview: ['#140800', '#ff6a00', '#ffd166'] },
  { key: 'toxic', name: 'Toxic', blurb: 'Radioactive green on bunker black.', unlock: { level: 7 }, dark: true, preview: ['#03110a', '#39ff14', '#c6ff00'] },
  { key: 'bubblegum', name: 'Bubblegum', blurb: 'Apocalypse, but make it cute.', unlock: { level: 9 }, dark: false, preview: ['#ffe4f1', '#3a0020', '#ff2d95'] },
  { key: 'terminal', name: 'Terminal', blurb: 'Green phosphor. Cursor blink. No mercy.', unlock: { level: 12 }, dark: true, preview: ['#000000', '#00ff88', '#00ff88'] },
  { key: 'arctic', name: 'Arctic', blurb: 'Ice blue, hard edges, quiet.', unlock: { level: 15 }, dark: false, preview: ['#e8f4ff', '#0b2545', '#1e90ff'] },
  { key: 'blood', name: 'Blood', blurb: 'Earned at 100 WPM. Red on black.', unlock: { achievement: 'speed_100' }, dark: true, preview: ['#0a0000', '#ff1a1a', '#ffffff'] },
  { key: 'royal', name: 'Royal', blurb: 'For weekend champions only.', unlock: { achievement: 'tournament_champion' }, dark: true, preview: ['#0f0020', '#ffd700', '#c084fc'] },
];
const FALLBACK_CARETS: CatalogItem[] = [
  { key: 'block', name: 'Block', blurb: 'Solid block on the next character.', unlock: {} },
  { key: 'line', name: 'Line', blurb: 'A thin vertical bar.', unlock: { level: 2 } },
  { key: 'underline', name: 'Underline', blurb: 'Underscore the target.', unlock: { level: 4 } },
  { key: 'box', name: 'Box', blurb: 'Outlined, no fill.', unlock: { level: 6 } },
  { key: 'ghost', name: 'Ghost', blurb: 'Soft, no blink. For the calm.', unlock: { level: 8 } },
  { key: 'rainbow', name: 'Rainbow', blurb: 'Cycles hue as you type.', unlock: { level: 15 } },
];
const FALLBACK_SOUNDS: CatalogItem[] = [
  { key: 'synth', name: 'Synth', blurb: 'Clean square-wave clicks.', unlock: {} },
  { key: 'mech', name: 'Mechanical', blurb: 'Thocky switches.', unlock: { level: 3 } },
  { key: 'typewriter', name: 'Typewriter', blurb: 'Clack, with a ding at the end.', unlock: { level: 5 } },
  { key: 'bubble', name: 'Bubble', blurb: 'Soft pops.', unlock: { level: 8 } },
  { key: 'laser', name: 'Laser', blurb: 'Pew.', unlock: { level: 11 } },
];
const FALLBACK_CATALOG: Catalog = { themes: FALLBACK_THEMES, carets: FALLBACK_CARETS, sounds: FALLBACK_SOUNDS, achievements: [] };

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'brutal', caret: 'block', sound: 'synth',
  font: 'mono', fontSize: 1, reducedMotion: prefersReducedMotion(),
  layout: 'qwerty', emulateLayout: false, highContrast: false, soundVolume: 1,
};

function sanitize(raw: Partial<Settings> | null | undefined): Settings {
  const r = raw || {};
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (typeof r.theme === 'string') s.theme = r.theme.slice(0, 30);
  if (typeof r.caret === 'string') s.caret = r.caret.slice(0, 30);
  if (typeof r.sound === 'string') s.sound = r.sound.slice(0, 30);
  if (FONT_KEYS.includes(r.font as FontKey)) s.font = r.font as FontKey;
  if (typeof r.fontSize === 'number' && FONT_SIZES.includes(r.fontSize)) s.fontSize = r.fontSize;
  if (typeof r.reducedMotion === 'boolean') s.reducedMotion = r.reducedMotion;
  if (LAYOUT_KEYS.includes(r.layout as LayoutKey)) s.layout = r.layout as LayoutKey;
  if (typeof r.emulateLayout === 'boolean') s.emulateLayout = r.emulateLayout;
  if (typeof r.highContrast === 'boolean') s.highContrast = r.highContrast;
  if (typeof r.soundVolume === 'number' && Number.isFinite(r.soundVolume)) s.soundVolume = Math.min(1, Math.max(0, r.soundVolume));
  return s;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings(s: Settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

function normalizeCatalog(data: Partial<Catalog> | null | undefined): Catalog {
  const list = (v: unknown, fallback: CatalogItem[]) => (Array.isArray(v) && v.length ? (v as CatalogItem[]) : fallback);
  return {
    themes: list(data?.themes, FALLBACK_THEMES),
    carets: list(data?.carets, FALLBACK_CARETS),
    sounds: list(data?.sounds, FALLBACK_SOUNDS),
    achievements: Array.isArray(data?.achievements) ? data!.achievements : [],
  };
}
function loadCatalog(): Catalog {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    return normalizeCatalog(raw ? JSON.parse(raw) : null);
  } catch {
    return FALLBACK_CATALOG;
  }
}

// ---------------------------------------------------------------- module state (works outside React)
let current: Settings = loadSettings();
let catalog: Catalog = loadCatalog();
const subscribers = new Set<(s: Settings) => void>();

export function getSettingsSnapshot(): Settings {
  return current;
}
export function getCatalogSnapshot(): Catalog {
  return catalog;
}
export function subscribeSettings(fn: (s: Settings) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function isDarkTheme(themeKey: string): boolean {
  const t = catalog.themes.find(x => x.key === themeKey) || FALLBACK_THEMES.find(x => x.key === themeKey);
  return !!t?.dark;
}

function applyToDocument(s: Settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = isDarkTheme(s.theme);
  root.dataset.theme = s.theme;
  root.dataset.font = s.font;
  root.classList.toggle('dark', dark);
  root.classList.toggle('themed', (s.theme !== 'brutal' && s.theme !== 'midnight') || s.highContrast);
  root.classList.toggle('reduced-motion', s.reducedMotion);
  root.classList.toggle('high-contrast', s.highContrast);
  root.style.setProperty('--typo-scale', String(s.fontSize));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const t = catalog.themes.find(x => x.key === s.theme);
    meta.setAttribute('content', s.theme === 'brutal' || s.theme === 'midnight' ? '#facc15' : (t?.preview?.[0] || '#facc15'));
  }
  setSoundPack(s.sound);
  setVolume(s.soundVolume);
}

function commit(next: Settings) {
  current = next;
  saveSettings(current);
  applyToDocument(current);
  for (const fn of subscribers) fn(current);
}

// before first paint: the module is evaluated as part of the app bundle
applyToDocument(current);

// ---------------------------------------------------------------- context
interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
  catalog: Catalog;
  locker: Locker | null;
  refreshLocker: () => Promise<void>;
  equipError: string;
}

const SettingsCtx = createContext<Ctx>({
  settings: current,
  update: () => {},
  open: () => {},
  close: () => {},
  isOpen: false,
  catalog,
  locker: null,
  refreshLocker: async () => {},
  equipError: '',
});

export const useSettings = () => useContext(SettingsCtx);

const COSMETIC_KEYS = ['theme', 'caret', 'sound'] as const;
const COSMETIC_DEFAULT: Record<typeof COSMETIC_KEYS[number], string> = { theme: 'brutal', caret: 'block', sound: 'synth' };

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [settings, setSettings] = useState<Settings>(current);
  const [catalogState, setCatalogState] = useState<Catalog>(catalog);
  const [locker, setLocker] = useState<Locker | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [equipError, setEquipError] = useState('');
  const errTimer = useRef<number | null>(null);

  useEffect(() => subscribeSettings(setSettings), []);

  const showError = useCallback((msg: string) => {
    setEquipError(msg);
    if (errTimer.current) window.clearTimeout(errTimer.current);
    errTimer.current = window.setTimeout(() => setEquipError(''), 4000);
  }, []);

  // public catalog: fetch once (after AuthContext set axios defaults), cache for the next boot
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    axios.get('/progression/catalog').then(res => {
      if (cancelled) return;
      catalog = normalizeCatalog(res.data);
      try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); } catch { /* storage unavailable */ }
      setCatalogState(catalog);
      applyToDocument(current); // the dark flag may have changed
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [authLoading]);

  // logged-in: the server locker is the source of truth for cosmetics
  const refreshLocker = useCallback(async () => {
    if (!userId) { setLocker(null); return; }
    try {
      const res = await axios.get('/progression/me');
      const l: Locker | undefined = res.data?.locker;
      if (!l) return;
      setLocker(l);
      const eq = l.equipped || {} as Locker['equipped'];
      const patch: Partial<Settings> = {};
      for (const k of COSMETIC_KEYS) {
        const v = eq[k];
        if (typeof v === 'string' && v && v !== current[k]) patch[k] = v;
      }
      if (Object.keys(patch).length) commit(sanitize({ ...current, ...patch }));
    } catch { /* offline or not logged in */ }
  }, [userId]);

  useEffect(() => { void refreshLocker(); }, [refreshLocker]);

  const update = useCallback((patch: Partial<Settings>) => {
    const prev = current;
    const cosmetics: Partial<Record<typeof COSMETIC_KEYS[number], string>> = {};
    for (const k of COSMETIC_KEYS) {
      const v = patch[k];
      if (typeof v === 'string' && v !== prev[k]) cosmetics[k] = v;
    }
    if (Object.keys(cosmetics).length && !userId) {
      // anonymous: only the always-unlocked defaults
      for (const k of Object.keys(cosmetics) as (keyof typeof cosmetics)[]) {
        if (cosmetics[k] !== COSMETIC_DEFAULT[k]) {
          showError('Log in or play as a guest to unlock cosmetics');
          delete patch[k];
        }
      }
    }
    commit(sanitize({ ...prev, ...patch }));
    const toSync = Object.fromEntries(Object.entries(cosmetics).filter(([k]) => k in patch));
    if (!userId || !Object.keys(toSync).length) return;
    axios.post('/progression/equip', toSync).then(() => {
      setLocker(l => (l ? { ...l, equipped: { ...l.equipped, ...toSync } } : l));
    }).catch(err => {
      const msg = err?.response?.data?.error || 'Could not equip that';
      const revert: Partial<Settings> = {};
      for (const k of Object.keys(toSync) as (keyof typeof cosmetics)[]) revert[k] = prev[k];
      commit(sanitize({ ...current, ...revert }));
      showError(msg);
    });
  }, [userId, showError]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<Ctx>(() => ({
    settings, update, open, close, isOpen, catalog: catalogState, locker, refreshLocker, equipError,
  }), [settings, update, open, close, isOpen, catalogState, locker, refreshLocker, equipError]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
};
