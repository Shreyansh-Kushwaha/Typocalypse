import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { useSettings } from '../contexts/SettingsContext';
import type { Locker, LockerItem } from '../contexts/SettingsContext';
import { CaretPreview, ThemeSwatch, lockLabel } from '../components/CosmeticPreviews';
import { previewPack } from '../sound';
import type { SoundPack } from '../sound';

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

  useEffect(() => {
    document.title = 'Progress — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  useEffect(() => {
    axios.get('/progression/me').then(res => setData(res.data)).catch(() => setError('Could not load your progress'));
  }, []);

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

  const equip = (kind: 'theme' | 'caret' | 'sound', key: string) => {
    update({ [kind]: key });
    void refreshLocker();
  };

  if (!data) {
    return (
      <Shell onBack={() => navigate('/dashboard')}>
        <p className="text-center mt-20 font-mono font-black animate-pulse">{error || 'OPENING THE LOCKER…'}</p>
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
              <p className="text-7xl md:text-8xl font-black font-mono leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{data.level}</p>
              {equipped.title && <Tag className="mt-2 bg-purple-300 dark:bg-black">{equipped.title}</Tag>}
            </div>
            <div className="text-right font-mono font-bold text-sm space-y-1">
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
            <div className="h-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden">
              <div className="h-full bg-black dark:bg-yellow-400 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, data.pct))}%` }} />
            </div>
          </div>
        </Panel>

        {/* locker */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black uppercase tracking-tighter">🎒 Locker</h2>
          {equipError && <p role="alert" className="font-mono text-xs font-bold text-red-600 dark:text-red-400">{equipError}</p>}
          <div className="grid md:grid-cols-3 gap-4">
            <Panel>
              <p className="font-black uppercase text-xs tracking-widest mb-3">Themes</p>
              <ul className="space-y-2">
                {data.locker.themes.map(t => (
                  <LockerRow key={t.key} item={t} on={settings.theme === t.key} names={achievementNames} onEquip={() => equip('theme', t.key)}>
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
                  <LockerRow key={c.key} item={c} on={settings.caret === c.key} names={achievementNames} onEquip={() => equip('caret', c.key)}>
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
                  <LockerRow key={s.key} item={s} on={settings.sound === s.key} names={achievementNames} onEquip={() => equip('sound', s.key)}
                    extra={<button type="button" onClick={() => previewPack(s.key as SoundPack)} className="font-mono text-[11px] font-bold border-2 border-black dark:border-yellow-400 px-1.5" aria-label={`Test ${s.name}`}>▶</button>}>
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
                  onClick={() => void setTitle(o.value)}
                  className={`border-2 border-black dark:border-yellow-400 font-mono text-xs font-bold px-2 py-1 ${on ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black hover:bg-purple-100 dark:hover:bg-yellow-400/10'}`}
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
            <h2 className="text-2xl font-black uppercase tracking-tighter">🏅 Achievements <span className="font-mono text-base">{data.unlockedCount}/{data.total}</span></h2>
            <div className="flex gap-2">
              {(['all', 'unlocked', 'locked'] as Filter[]).map(f => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`border-2 border-black dark:border-yellow-400 font-mono text-xs font-bold uppercase px-2 py-1 ${filter === f ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shown.map(a => (
              <div
                key={a.key}
                className={`border-4 border-black dark:border-yellow-400 p-3 flex gap-3 ${a.unlocked ? 'bg-green-300 dark:bg-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15]' : 'bg-gray-200 dark:bg-black/50 opacity-70'}`}
              >
                <span className={`text-3xl leading-none ${a.unlocked ? '' : 'grayscale'}`} aria-hidden="true">{a.icon}</span>
                <div className="min-w-0">
                  <p className="font-black uppercase text-sm leading-tight">{a.name}</p>
                  <p className="font-mono text-xs font-bold mt-1">{a.description}</p>
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
  item: LockerItem; on: boolean; names: { key: string; name: string }[];
  onEquip: () => void; extra?: React.ReactNode; children: React.ReactNode;
}> = ({ item, on, names, onEquip, extra, children }) => (
  <li className={`flex items-center gap-2 border-2 border-black dark:border-yellow-400 px-2 py-1.5 ${item.unlocked ? '' : 'opacity-60'}`} title={item.blurb}>
    {children}
    <span className="ml-auto flex items-center gap-1.5 shrink-0">
      {extra}
      {item.unlocked ? (
        <button
          type="button"
          onClick={onEquip}
          disabled={on}
          aria-pressed={on}
          className={`font-mono text-[11px] font-bold uppercase border-2 border-black dark:border-yellow-400 px-2 py-0.5 ${on ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-cyan-300 dark:bg-black hover:translate-x-[1px] hover:translate-y-[1px]'}`}
        >
          {on ? 'Equipped' : 'Equip'}
        </button>
      ) : (
        <span className="font-mono text-[11px] font-bold uppercase">🔒 {lockLabel(item, names)}</span>
      )}
    </span>
  </li>
);

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tighter">
          Your <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Progress</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-6 relative z-10">{children}</main>
  </div>
);

export default ProgressionPage;
