import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSettings, FONT_SIZES } from '../contexts/SettingsContext';
import type { CatalogItem, FontKey, LayoutKey } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { CaretPreview, ThemeSwatch, lockLabel } from './CosmeticPreviews';
import { previewPack, isMuted, toggleMute, sfx } from '../sound';
import type { SoundPack } from '../sound';
import { LAYOUTS, heatRows } from '../layouts';
import { useInstall, promptInstall, useOnline, serviceWorkerSupported, ensureServiceWorker, urlBase64ToUint8Array } from '../pwa';

const box = 'bg-white dark:bg-black border-4 border-black dark:border-yellow-400';
const label = 'font-black uppercase text-[11px] tracking-widest';
const optBase = 'border-2 border-black dark:border-yellow-400 font-mono text-xs font-bold px-2 py-1 transition-all';
const optOn = 'bg-black text-white dark:bg-yellow-400 dark:text-black';
const optOff = 'bg-white dark:bg-black text-black dark:text-yellow-400 hover:bg-cyan-100 dark:hover:bg-yellow-400/10';
const optLocked = 'opacity-40 cursor-not-allowed';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className={`${box} p-3 space-y-3`}>
    <h3 className="font-black uppercase text-sm tracking-widest border-b-4 border-black dark:border-yellow-400 pb-1">{title}</h3>
    {children}
  </section>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; hint?: string; disabled?: boolean }> = ({ checked, onChange, children, hint, disabled }) => (
  <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
      className="mt-0.5 w-5 h-5 shrink-0 accent-black dark:accent-yellow-400"
    />
    <span className="min-w-0">
      <span className="font-bold text-sm block">{children}</span>
      {hint && <span className="font-mono text-[11px] text-gray-500 dark:text-yellow-400/60 block">{hint}</span>}
    </span>
  </label>
);

const SettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, update, catalog, locker, equipError } = useSettings();
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [muted, setMuted] = useState(isMuted());

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [onClose]);

  // unlocked? - server locker when logged in, else only the always-free defaults
  const unlocked = (kind: 'themes' | 'carets' | 'sounds', item: CatalogItem) => {
    if (locker) return !!locker[kind].find(i => i.key === item.key)?.unlocked;
    return !item.unlock?.level && !item.unlock?.achievement;
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 border-l-4 border-black dark:border-yellow-400 overflow-y-auto animate-[drawerin_0.2s_ease-out] font-sans">
        <header className="sticky top-0 z-10 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tighter">
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Settings</span>
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close settings"
            className="font-black text-lg border-2 border-black dark:border-yellow-400 px-3 py-0.5 bg-red-400 dark:bg-black hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            ✕
          </button>
        </header>

        {equipError && (
          <p role="alert" className="mx-4 mt-3 font-mono text-xs font-bold bg-red-300 dark:bg-red-900 text-black dark:text-red-200 border-2 border-black dark:border-red-400 px-2 py-1">
            {equipError}
          </p>
        )}

        <div className="p-4 space-y-4 pb-10">
          {/* ---------------------------------------------------------- appearance */}
          <Section title="Appearance">
            <p className={label}>Theme</p>
            <div className="grid grid-cols-2 gap-2">
              {catalog.themes.map(t => {
                const ok = unlocked('themes', t);
                const on = settings.theme === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    disabled={!ok}
                    aria-pressed={on}
                    title={ok ? t.blurb : `Locked — ${lockLabel(t, catalog.achievements)}`}
                    onClick={() => ok && update({ theme: t.key })}
                    className={`${optBase} flex items-center gap-2 text-left ${on ? optOn : optOff} ${ok ? '' : optLocked}`}
                  >
                    <ThemeSwatch item={t} />
                    <span className="min-w-0 truncate">{t.name}</span>
                    {!ok && <span className="ml-auto text-[10px] shrink-0">🔒 {lockLabel(t, catalog.achievements)}</span>}
                  </button>
                );
              })}
            </div>

            <p className={label}>Caret</p>
            <div className="grid grid-cols-2 gap-2">
              {catalog.carets.map(c => {
                const ok = unlocked('carets', c);
                const on = settings.caret === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={!ok}
                    aria-pressed={on}
                    title={ok ? c.blurb : `Locked — ${lockLabel(c, catalog.achievements)}`}
                    onClick={() => ok && update({ caret: c.key })}
                    className={`${optBase} flex items-center justify-between gap-2 ${on ? optOn : optOff} ${ok ? '' : optLocked}`}
                  >
                    <span>{c.name}</span>
                    {!ok && <span className="text-[10px]">🔒 {lockLabel(c, catalog.achievements)}</span>}
                  </button>
                );
              })}
            </div>
            <div className={`${box} p-2 flex items-center justify-between`}>
              <CaretPreview caret={settings.caret} />
              <span className="font-mono text-[10px] uppercase text-gray-500 dark:text-yellow-400/60">live preview</span>
            </div>

            <p className={label}>Font</p>
            <div className="flex flex-wrap gap-2">
              {([['mono', 'Mono'], ['sans', 'Sans'], ['serif', 'Serif'], ['dyslexic', 'OpenDyslexic']] as [FontKey, string][]).map(([k, n]) => (
                <button key={k} type="button" aria-pressed={settings.font === k} onClick={() => update({ font: k })} className={`${optBase} ${settings.font === k ? optOn : optOff}`}>{n}</button>
              ))}
            </div>

            <p className={label}>Text size</p>
            <div className="flex flex-wrap gap-2">
              {FONT_SIZES.map(s => (
                <button key={s} type="button" aria-pressed={settings.fontSize === s} onClick={() => update({ fontSize: s })} className={`${optBase} ${settings.fontSize === s ? optOn : optOff}`}>
                  {s === 0.85 ? 'S' : s === 1 ? 'M' : s === 1.15 ? 'L' : 'XL'} <span className="opacity-60">{Math.round(s * 100)}%</span>
                </button>
              ))}
            </div>

            <Toggle checked={settings.highContrast} onChange={v => update({ highContrast: v })} hint="Pure black and white, thicker borders.">High contrast</Toggle>
            <Toggle checked={settings.reducedMotion} onChange={v => update({ reducedMotion: v })} hint="No shakes, pulses or slides.">Reduce motion</Toggle>
          </Section>

          {/* ---------------------------------------------------------- sound */}
          <Section title="Sound">
            <p className={label}>Keystroke pack</p>
            <div className="space-y-1.5">
              {catalog.sounds.map(s => {
                const ok = unlocked('sounds', s);
                const on = settings.sound === s.key;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!ok}
                      aria-pressed={on}
                      title={ok ? s.blurb : `Locked — ${lockLabel(s, catalog.achievements)}`}
                      onClick={() => ok && update({ sound: s.key })}
                      className={`${optBase} flex-1 flex items-center justify-between ${on ? optOn : optOff} ${ok ? '' : optLocked}`}
                    >
                      <span>{s.name}</span>
                      {!ok && <span className="text-[10px]">🔒 {lockLabel(s, catalog.achievements)}</span>}
                    </button>
                    <button type="button" onClick={() => previewPack(s.key as SoundPack)} className={`${optBase} ${optOff}`} aria-label={`Test ${s.name}`}>▶ test</button>
                  </div>
                );
              })}
            </div>
            <label className="block">
              <span className={label}>Volume · {Math.round(settings.soundVolume * 100)}%</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={settings.soundVolume}
                onChange={e => update({ soundVolume: parseFloat(e.target.value) })}
                onMouseUp={() => sfx.pop()}
                onTouchEnd={() => sfx.pop()}
                className="w-full accent-black dark:accent-yellow-400"
                aria-label="Volume"
              />
            </label>
            <Toggle checked={muted} onChange={() => setMuted(toggleMute())} hint="Silences every sound effect.">Mute</Toggle>
          </Section>

          {/* ---------------------------------------------------------- keyboard */}
          <Section title="Keyboard">
            <label className="block">
              <span className={label}>Layout</span>
              <select
                value={settings.layout}
                onChange={e => update({ layout: e.target.value as LayoutKey })}
                className={`${box} w-full mt-1 px-2 py-1 font-mono text-sm font-bold`}
              >
                {LAYOUTS.map(l => <option key={l.key} value={l.key}>{l.name}</option>)}
              </select>
            </label>
            <Toggle
              checked={settings.emulateLayout}
              onChange={v => update({ emulateLayout: v })}
              disabled={settings.layout === 'qwerty'}
              hint="Keys are read by physical position, so a QWERTY keyboard types as if it were the layout above."
            >
              Emulate layout on a QWERTY keyboard
            </Toggle>
            <div className="space-y-1 overflow-x-auto pb-1" aria-hidden="true">
              {heatRows(settings.layout).map((row, ri) => (
                <div key={ri} className="flex gap-1" style={{ paddingLeft: `${ri * 10}px` }}>
                  {Array.from(row).map((ch, i) => (
                    <span key={i} className="w-6 h-6 border-2 border-black dark:border-yellow-400 flex items-center justify-center font-mono text-[11px] font-black uppercase shrink-0">{ch}</span>
                  ))}
                </div>
              ))}
            </div>
          </Section>

          {/* ---------------------------------------------------------- notifications */}
          <NotificationsSection loggedIn={!!user} isGuest={!!user?.isGuest} hasEmail={!!user?.email} />

          {/* ---------------------------------------------------------- app */}
          <AppSection />

          <div className="flex flex-wrap gap-2">
            <Link to="/progress" onClick={onClose} className={`${optBase} ${optOff} bg-yellow-300`}>🎒 Locker &amp; achievements</Link>
            <Link to="/friends" onClick={onClose} className={`${optBase} ${optOff} bg-cyan-300`}>🫂 Friends</Link>
            <Link to="/privacy" onClick={onClose} className={`${optBase} ${optOff} bg-purple-300`}>🔒 Privacy policy</Link>
          </div>
        </div>
      </aside>
    </div>
  );
};

// ---------------------------------------------------------------- notifications
interface Prefs { email: boolean; push: boolean; hasEmail: boolean; subscriptions: number }

const NotificationsSection: React.FC<{ loggedIn: boolean; isGuest: boolean; hasEmail: boolean }> = ({ loggedIn, isGuest, hasEmail }) => {
  const pushSupported = serviceWorkerSupported() && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.getRegistration().then(reg => reg?.pushManager.getSubscription()).then(sub => setEndpoint(sub?.endpoint || null)).catch(() => {});
  }, [pushSupported]);

  useEffect(() => {
    if (!loggedIn) return;
    axios.get('/notify/prefs').then(res => setPrefs(res.data)).catch(() => {});
  }, [loggedIn]);

  const why = !pushSupported
    ? (typeof window !== 'undefined' && !window.isSecureContext ? 'Push needs a secure (https) page.'
      : !('serviceWorker' in navigator) ? 'This browser has no service worker support.'
        : 'This browser does not support Web Push.')
    : '';

  const subscribe = useCallback(async () => {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setMsg('Permission was not granted.'); return; }
      const reg = await ensureServiceWorker();
      if (!reg) { setMsg('Could not start the service worker.'); return; }
      const ready = await Promise.race([navigator.serviceWorker.ready, new Promise<ServiceWorkerRegistration>(r => setTimeout(() => r(reg), 3000))]);
      const { data } = await axios.get('/push/key');
      const sub = await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.publicKey) });
      const res = await axios.post('/push/subscribe', { subscription: sub.toJSON() });
      setEndpoint(sub.endpoint);
      if (res.data?.prefs) setPrefs(res.data.prefs);
      setMsg('Push reminders on for this device.');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setMsg(e?.response?.data?.error || e?.message || 'Could not subscribe.');
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const ep = sub?.endpoint || endpoint;
      await sub?.unsubscribe().catch(() => {});
      if (ep && loggedIn) {
        const res = await axios.delete('/push/subscribe', { data: { endpoint: ep } });
        if (res.data?.prefs) setPrefs(res.data.prefs);
      }
      setEndpoint(null);
      setMsg('Push reminders off for this device.');
    } catch (err) {
      const e = err as { message?: string };
      setMsg(e?.message || 'Could not unsubscribe.');
    } finally {
      setBusy(false);
    }
  }, [endpoint, loggedIn]);

  const sendTest = async () => {
    setBusy(true); setMsg('');
    try {
      const res = await axios.post('/push/test');
      setMsg(res.data.sent ? `Sent to ${res.data.sent} device${res.data.sent === 1 ? '' : 's'}.` : 'No live subscriptions to send to.');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setMsg(e?.response?.data?.error || 'Test failed.');
    } finally {
      setBusy(false);
    }
  };

  const setEmail = async (v: boolean) => {
    setBusy(true); setMsg('');
    try {
      const res = await axios.post('/notify/prefs', { email: v });
      setPrefs(res.data);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setMsg(e?.response?.data?.error || 'Could not update.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Notifications">
      <p className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60">
        A nudge when a 2+ day streak is about to die (after 16:00 UTC, once a day).
      </p>
      {!loggedIn ? (
        <p className="font-mono text-xs font-bold">Log in or play as a guest to turn on reminders.</p>
      ) : why ? (
        <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400">{why}</p>
      ) : (
        <>
          <Toggle
            checked={!!endpoint && permission === 'granted'}
            disabled={busy || permission === 'denied'}
            onChange={v => (v ? void subscribe() : void unsubscribe())}
            hint={`Permission: ${permission}${prefs ? ` · ${prefs.subscriptions} device${prefs.subscriptions === 1 ? '' : 's'} subscribed` : ''}`}
          >
            Push reminders on this device
          </Toggle>
          {permission === 'denied' && (
            <p className="font-mono text-[11px] font-bold text-red-600 dark:text-red-400">Notifications are blocked for this site in the browser settings.</p>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={busy || !endpoint} onClick={sendTest} className={`${optBase} ${optOff} disabled:opacity-40`}>Send test</button>
          </div>
        </>
      )}
      {loggedIn && !isGuest && (
        <Toggle
          checked={!!prefs?.email}
          disabled={busy || !(hasEmail || prefs?.hasEmail)}
          onChange={v => void setEmail(v)}
          hint={(hasEmail || prefs?.hasEmail) ? 'One email per at-risk day.' : 'Add an email to your account first.'}
        >
          Email reminders
        </Toggle>
      )}
      {loggedIn && isGuest && (
        <p className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60">
          <Link to="/claim" className="underline">Claim your account</Link> to get email reminders too.
        </p>
      )}
      {msg && <p role="status" className="font-mono text-xs font-bold">{msg}</p>}
    </Section>
  );
};

// ---------------------------------------------------------------- app / pwa
function readQueueCount(): number {
  try {
    const raw = localStorage.getItem('typo-session-queue');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

const AppSection: React.FC = () => {
  const { canInstall, installed } = useInstall();
  const online = useOnline();
  const [queued, setQueued] = useState(readQueueCount);
  const [swActive, setSwActive] = useState(() => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller);
  const [installMsg, setInstallMsg] = useState('');

  useEffect(() => {
    const tick = () => setQueued(readQueueCount());
    window.addEventListener('storage', tick);
    const t = window.setInterval(tick, 3000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => setSwActive(!!reg?.active)).catch(() => {});
    }
    return () => { window.removeEventListener('storage', tick); window.clearInterval(t); };
  }, []);

  const install = async () => {
    const r = await promptInstall();
    setInstallMsg(r === 'accepted' ? 'Installed. Look for Typocalypse on your home screen.' : r === 'dismissed' ? 'Maybe later.' : 'Use your browser menu → "Install app" / "Add to Home Screen".');
  };

  return (
    <Section title="App">
      <div className="flex flex-wrap items-center gap-2">
        {installed ? (
          <span className={`${optBase} bg-green-300 dark:bg-black`}>✓ Installed</span>
        ) : canInstall ? (
          <button type="button" onClick={() => void install()} className={`${optBase} ${optOff} bg-green-300`}>⬇ Install app</button>
        ) : (
          <span className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60">Install: browser menu → “Install app” / “Add to Home Screen”</span>
        )}
        <span className={`${optBase} ${online ? 'bg-green-300 dark:bg-black' : 'bg-red-300 dark:bg-red-900'}`}>{online ? '● Online' : '○ Offline'}</span>
        <span className={`${optBase} ${optOff}`} title="Offline shell">{swActive ? 'Offline ready' : 'Offline cache off'}</span>
      </div>
      {installMsg && <p className="font-mono text-xs font-bold">{installMsg}</p>}
      <p className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60">
        {queued > 0 ? `${queued} result${queued === 1 ? '' : 's'} queued — they upload when you are back online.` : 'No results waiting to upload.'}
      </p>
    </Section>
  );
};

export default SettingsPanel;
