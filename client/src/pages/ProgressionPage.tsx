import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { useSettings } from '../contexts/SettingsContext';
import type { Locker, LockerItem } from '../contexts/SettingsContext';
import { CaretPreview, ThemeSwatch, lockLabel } from '../components/CosmeticPreviews';
import { previewPack } from '../sound';
import type { SoundPack } from '../sound';
import { SeoFor } from '../seo';

interface Achievement { key: string; name: string; icon: string; description: string; xp: number; unlocked: boolean; at: string | null }
interface SeasonTitle { season: string; number: number; rank: number; title: string }
interface Progression {
  level: number; xp: number; floor: number; next: number; pct: number;
  achievements: Achievement[]; unlockedCount: number; total: number;
  locker: Locker; counters: Record<string, number>; seasonTitles: SeasonTitle[];
}

type Filter = 'all' | 'unlocked' | 'locked';

const ProgressionPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, update, refreshLocker, equipError } = useSettings();
  const [data, setData] = useState<Progression | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [titleMsg, setTitleMsg] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [equipping, setEquipping] = useState<string | null>(null);

  const load = useCallback(() => {
    setError('');
    axios.get('/progression/me').then(res => setData(res.data)).catch(() => setError('Could not load your progress'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const achievementNames = useMemo(() => (data?.achievements || []).map(a => ({ key: a.key, name: a.name })), [data]);
  const shown = useMemo(() => {
    const list = data?.achievements || [];
    if (filter === 'unlocked') return list.filter(a => a.unlocked);
    if (filter === 'locked') return list.filter(a => !a.unlocked);
    return list;
  }, [data, filter]);

  const titleOptions = useMemo(() => {
    if (!data) return [] as { value: string; label: string }[];
    const opts: { value: string; label: string }[] = [{ value: '', label: '— no title —' }];
    for (const t of data.seasonTitles || []) opts.push({ value: t.title, label: `🏆 ${t.title}` });
    for (const a of data.achievements) if (a.unlocked && !opts.some(o => o.value === a.name)) opts.push({ value: a.name, label: `${a.icon} ${a.name}` });
    return opts;
  }, [data]);

  const setTitle = async (title: string) => {
    if (savingTitle) return;
    setSavingTitle(true); setTitleMsg('');
    try {
      const res = await axios.post('/progression/equip', { title });
      setData(d => (d ? { ...d, locker: { ...d.locker, equipped: { ...d.locker.equipped, title: res.data?.equipped?.title ?? title } } } : d));
      setTitleMsg(title ? `Title set: ${title}` : 'Title cleared');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setTitleMsg(e?.response?.data?.error || 'Could not set title');
    } finally {
      setSavingTitle(false);
    }
  };

  // `update` posts to /progression/equip in the background and reverts + surfaces
  // `equipError` ("still locked") if the server refuses. Keep the button busy
  // until the locker has been re-read so a double click cannot race it.
  const equip = async (kind: 'theme' | 'caret' | 'sound', key: string) => {
    if (equipping) return;
    setEquipping(`${kind}:${key}`);
    update({ [kind]: key });
    try { await refreshLocker(); } finally { setEquipping(null); }
  };

  if (!data) {
    return (
      <Shell onBack={() => navigate('/dashboard')}>
        <div className="max-w-5xl mx-auto space-y-6">
          {error ? (
            <Panel className="text-center py-10">
              <p role="alert" className="text-lg sm:text-xl font-black uppercase mb-2 break-words">{error}</p>
              <p className="font-mono text-sm font-bold mb-6">Your level and unlocks are safe on the server.</p>
              <Btn color="bg-green-300" onClick={load}>Retry</Btn>
            </Panel>
          ) : (
            <div className="space-y-6" aria-busy="true">
              <Panel className="bg-yellow-300 dark:bg-black">
                <p className="font-black uppercase text-xs tracking-widest">Level</p>
                <Skel className="h-16 sm:h-20 w-28 mt-2" />
                <Skel className="h-6 w-full mt-6" />
                <p className="font-mono text-xs font-bold uppercase mt-2">Opening the locker…</p>
              </Panel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="border-4 border-black/30 dark:border-yellow-400/30 p-3 flex gap-3">
                    <Skel className="h-8 w-8 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skel className="h-4 w-2/3" />
                      <Skel className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  const span = Math.max(1, data.next - data.floor);
  const into = Math.max(0, data.xp - data.floor);
  const equipped = data.locker.equipped;

  return (
    <Shell onBack={() => navigate('/dashboard')}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* hero */}
        <Panel className="bg-yellow-300 dark:bg-black">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-black uppercase text-xs tracking-widest">Level</p>
              <p className="text-6xl sm:text-7xl md:text-8xl font-black font-mono leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{data.level}</p>
              {equipped.title && <Tag className="mt-2 bg-purple-300 dark:bg-black">{equipped.title}</Tag>}
            </div>
            <div className="text-left sm:text-right font-mono font-bold text-sm space-y-1 break-words">
              <p><span className="font-black text-2xl">{data.xp.toLocaleString()}</span> XP total</p>
              <p>{data.unlockedCount}/{data.total} achievements</p>
              <p>{data.counters?.sessions || 0} passages · {(data.counters?.chars || 0).toLocaleString()} chars</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between font-mono text-xs font-bold mb-1">
              <span>{into.toLocaleString()} / {span.toLocaleString()} XP to level {data.level + 1}</span>
              <span>{data.pct}%</span>
            </div>
            <div
              className="h-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(data.pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${into.toLocaleString()} of ${span.toLocaleString()} XP toward level ${data.level + 1}`}
            >
              <div className="h-full bg-black dark:bg-yellow-400 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, data.pct))}%` }} />
            </div>
          </div>
        </Panel>

        {/* locker */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter"><span aria-hidden="true">🎒 </span>Locker</h2>
          <div aria-live="polite">
            {equipError && (
              <p role="alert" className="font-mono text-xs font-bold uppercase text-black bg-red-400 border-2 border-black px-3 py-2 break-words">
                {equipError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel>
              <p className="font-black uppercase text-xs tracking-widest mb-3">Themes</p>
              <ul className="space-y-2">
                {data.locker.themes.map(t => (
                  <LockerRow key={t.key} item={t} on={settings.theme === t.key} busy={equipping === `theme:${t.key}`} anyBusy={!!equipping} names={achievementNames} onEquip={() => void equip('theme', t.key)}>
                    <ThemeSwatch item={t} />
                    <span className="font-bold text-sm">{t.name}</span>
                  </LockerRow>
                ))}
              </ul>
            </Panel>
            <Panel>
              <p className="font-black uppercase text-xs tracking-widest mb-3">Carets</p>
              <ul className="space-y-2">
                {data.locker.carets.map(c => (
                  <LockerRow key={c.key} item={c} on={settings.caret === c.key} busy={equipping === `caret:${c.key}`} anyBusy={!!equipping} names={achievementNames} onEquip={() => void equip('caret', c.key)}>
                    <span className="font-bold text-sm w-20">{c.name}</span>
                    <CaretPreview caret={c.key} className="text-sm" />
                  </LockerRow>
                ))}
              </ul>
            </Panel>
            <Panel>
              <p className="font-black uppercase text-xs tracking-widest mb-3">Sound packs</p>
              <ul className="space-y-2">
                {data.locker.sounds.map(s => (
                  <LockerRow key={s.key} item={s} on={settings.sound === s.key} busy={equipping === `sound:${s.key}`} anyBusy={!!equipping} names={achievementNames} onEquip={() => void equip('sound', s.key)}
                    extra={<button type="button" onClick={() => previewPack(s.key as SoundPack)} className="font-mono text-[11px] font-bold border-2 border-black dark:border-yellow-400 px-1.5 py-1" aria-label={`Test the ${s.name} sound pack`} title={`Test the ${s.name} sound pack`}><span aria-hidden="true">▶</span></button>}>
                    <span className="font-bold text-sm">{s.name}</span>
                  </LockerRow>
                ))}
              </ul>
            </Panel>
          </div>
        </section>

        {/* titles */}
        <Panel>
          <p className="font-black uppercase text-xs tracking-widest mb-2">Title</p>
          <p className="font-mono text-xs font-bold mb-3 text-gray-500 dark:text-yellow-400/60">Shown on your profile and the leaderboard. Season podiums and unlocked achievements count.</p>
          <div className="flex flex-wrap gap-2">
            {titleOptions.map(o => {
              const on = (equipped.title || '') === o.value;
              return (
                <button
                  key={o.value || '__none'}
                  type="button"
                  disabled={savingTitle}
                  aria-pressed={on}
                  aria-busy={savingTitle}
                  onClick={() => void setTitle(o.value)}
                  className={`border-2 border-black dark:border-yellow-400 font-mono text-xs font-bold px-2 py-2 min-h-[40px] break-words disabled:opacity-50 ${on ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black hover:bg-purple-100 dark:hover:bg-yellow-400/10'}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {titleMsg && <p role="status" className="font-mono text-xs font-bold mt-2">{titleMsg}</p>}
        </Panel>

        {/* achievements */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter"><span aria-hidden="true">🏅 </span>Achievements <span className="font-mono text-base">{data.unlockedCount}/{data.total}</span></h2>
            <div className="flex gap-2">
              {(['all', 'unlocked', 'locked'] as Filter[]).map(f => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`border-2 border-black dark:border-yellow-400 font-mono text-xs font-bold uppercase px-3 py-2 min-h-[40px] ${filter === f ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shown.map(a => (
              <div
                key={a.key}
                className={`border-4 border-black dark:border-yellow-400 p-3 flex gap-3 ${a.unlocked ? 'bg-green-300 dark:bg-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15]' : 'bg-gray-200 dark:bg-black/50 opacity-70'}`}
              >
                <span className={`text-3xl leading-none ${a.unlocked ? '' : 'grayscale'}`} aria-hidden="true">{a.icon}</span>
                <div className="min-w-0">
                  <p className="font-black uppercase text-sm leading-tight break-words">{a.name}</p>
                  <p className="font-mono text-xs font-bold mt-1 break-words">{a.description}</p>
                  <p className="font-mono text-[11px] font-bold mt-1 text-gray-600 dark:text-yellow-400/60">
                    +{a.xp} XP{a.unlocked && a.at ? ` · ${new Date(a.at).toLocaleDateString()}` : ' · locked'}
                  </p>
                </div>
              </div>
            ))}
            {shown.length === 0 && <p className="font-mono font-bold text-sm">Nothing here yet.</p>}
          </div>
        </section>
      </div>
    </Shell>
  );
};

const LockerRow: React.FC<{
  item: LockerItem; on: boolean; busy?: boolean; anyBusy?: boolean; names: { key: string; name: string }[];
  onEquip: () => void; extra?: React.ReactNode; children: React.ReactNode;
}> = ({ item, on, busy, anyBusy, names, onEquip, extra, children }) => (
  <li className={`flex flex-wrap items-center gap-2 border-2 border-black dark:border-yellow-400 px-2 py-1.5 ${item.unlocked ? '' : 'opacity-60'}`} title={item.blurb}>
    {children}
    <span className="ml-auto flex items-center gap-1.5 shrink-0">
      {extra}
      {item.unlocked ? (
        <button
          type="button"
          onClick={onEquip}
          disabled={on || !!anyBusy}
          aria-pressed={on}
          aria-busy={!!busy}
          className={`font-mono text-[11px] font-bold uppercase border-2 border-black dark:border-yellow-400 px-2 py-1 min-h-[32px] disabled:opacity-50 ${on ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-cyan-300 dark:bg-black hover:translate-x-[1px] hover:translate-y-[1px]'}`}
        >
          {busy ? 'Equipping…' : on ? 'Equipped' : 'Equip'}
        </button>
      ) : (
        <span className="font-mono text-[11px] font-bold uppercase break-words"><span aria-hidden="true">🔒 </span>{lockLabel(item, names)}</span>
      )}
    </span>
  </li>
);

/** A pulsing bar in the shape of the content it stands in for. */
const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`block bg-black/15 dark:bg-yellow-400/20 animate-pulse ${className}`} />
);

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16 overflow-x-hidden">
    <SeoFor path="/progress" />
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
          Your <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Progress</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">{children}</main>
  </div>
);

export default ProgressionPage;
