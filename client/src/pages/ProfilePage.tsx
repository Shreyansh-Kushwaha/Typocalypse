import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import KeyboardHeatmap from '../components/KeyboardHeatmap';
import type { KeyStat } from '../components/KeyboardHeatmap';
import { Seo } from '../seo';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { copyText } from '../share';
import { MODE_LIST } from '../multiplayer/types';
import { LevelBadge } from '../social/LevelBadge';
import { FollowButton } from '../social/FollowButton';
import { Bar, ErrorNote, SkeletonBlock } from '../social/Skeleton';

interface Profile {
  username: string;
  joined: string;
  streak: { current: number; longest: number };
  summary: { games: number; bestWpm: number; avgWpm: number; avgAccuracy: number; totalTyped: number };
  weakKeys: { ch: string; attempts: number; missRate: number }[];
  keyStats: Record<string, KeyStat>;
  history: { wpm: number; accuracy: number }[];
  multiplayer: { matches: number; byMode: Record<string, number> };
  ghosts: { id: string; wpm: number; accuracy: number; genre: string; preview: string }[];
  isMe: boolean;
  level: { level: number; xp: number; floor: number; next: number; pct: number };
  title: string;
  theme: string;
  seasonTitles: { season: string; number: number; rank: number; title: string }[];
  achievements: string[];
  rating: { value: number; games: number; wins: number; losses: number };
  social: { followers: number; following: number; iFollow: boolean };
  arcade?: { meteorBest: number };
}
interface AchievementDef { key: string; name: string; icon: string; description: string; xp: number }
interface Person { username: string; level: number; title: string }

// The catalog never changes at runtime - fetch it once per page load.
let catalogPromise: Promise<AchievementDef[]> | null = null;
function loadCatalog(): Promise<AchievementDef[]> {
  if (!catalogPromise) {
    catalogPromise = axios.get('/progression/catalog').then(res => res.data.achievements as AchievementDef[]).catch(() => { catalogPromise = null; return []; });
  }
  return catalogPromise;
}

const linkCls = 'underline decoration-2 underline-offset-2 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black';

/** One sentence for search results, built from the numbers we actually have. */
function describeProfile(p: Profile): string {
  const best = p.summary?.bestWpm || 0;
  const acc = p.summary?.avgAccuracy || 0;
  const games = p.summary?.games || 0;
  const level = p.level?.level || 1;
  const streak = p.streak?.current || 0;
  if (!best || !acc) {
    return `${p.username} is a typist on Typocalypse. Follow their runs, race their ghosts, and watch them climb the global typing ladder.`;
  }
  const extra = streak > 1
    ? `, ${streak} day streak`
    : games ? `, ${games} passage${games === 1 ? '' : 's'} typed` : '';
  return `${p.username} types ${best} WPM at ${acc}% accuracy on Typocalypse. Level ${level}${extra}. Race their ghosts and see their keyboard heatmap.`;
}

/** Text alternative for the heatmap graphic - names the keys that miss most. */
function describeHeatmap(p: Profile): string {
  const worst = (p.weakKeys || [])
    .slice(0, 3)
    .map(k => `${k.ch === ' ' ? 'space' : k.ch} at ${Math.round(k.missRate * 100)}% missed`);
  return worst.length
    ? `Keyboard heatmap for ${p.username}. Most-missed keys: ${worst.join(', ')}.`
    : `Keyboard heatmap for ${p.username}. No key has enough attempts yet to show a miss rate.`;
}

// Public typist profile - readable logged out, built to be linked from anywhere.
const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [catalog, setCatalog] = useState<AchievementDef[]>([]);
  const [list, setList] = useState<{ kind: 'followers' | 'following'; rows: Person[] | null; error?: string } | null>(null);

  const name = username || '';
  const card = `/og/u/${encodeURIComponent(name)}.png`;

  const load = useCallback(() => {
    setProfile(null);
    setList(null);
    setError('');
    axios.get(`/users/${encodeURIComponent(name)}/public`)
      .then(res => setProfile(res.data))
      .catch(err => setError(err?.response?.data?.error || 'Typist not found'));
  }, [name]);

  useEffect(load, [load]);
  useEffect(() => { loadCatalog().then(setCatalog); }, []);

  const openList = (kind: 'followers' | 'following') => {
    if (list?.kind === kind) { setList(null); return; }
    setList({ kind, rows: null });
    axios.get(`/social/${encodeURIComponent(name)}/${kind}`)
      .then(res => setList({ kind, rows: res.data.rows }))
      .catch(() => setList({ kind, rows: [], error: 'Could not load that list.' }));
  };

  // Exactly one Seo for the page - the copy follows whatever is known so far.
  const seo = <Seo
    title={profile ? profile.username : (name || 'Typist')}
    description={
      error
        ? `No Typocalypse typist called ${name || 'that'}. Browse the global ladder instead, or take today's Daily Apocalypse challenge.`
        : profile
          ? describeProfile(profile)
          : `${name || 'This typist'} on Typocalypse: best WPM, accuracy, level, streak, keyboard heatmap, and ghosts anyone can race.`
    }
    image={error ? undefined : card}
    noIndex={!!error}
  />;

  if (error) {
    return (
      <Shell>
        {seo}
        <Panel className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-xl font-black uppercase mb-4 break-words">{error}</h1>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Btn className="w-full sm:w-auto" onClick={load}>Try again</Btn>
            <Btn color="bg-yellow-300" className="w-full sm:w-auto" onClick={() => navigate('/')}>Home</Btn>
          </div>
        </Panel>
      </Shell>
    );
  }
  if (!profile) {
    return (
      <Shell>
        {seo}
        <ProfileSkeleton name={name} />
      </Shell>
    );
  }

  const maxWpm = Math.max(...profile.history.map(h => h.wpm), 1);
  const unlocked = new Set(profile.achievements || []);
  const unlockedDefs = catalog.filter(a => unlocked.has(a.key));
  const level = profile.level || { level: 1, xp: 0, floor: 0, next: 100, pct: 0 };
  const rating = profile.rating || { value: 1000, games: 0, wins: 0, losses: 0 };
  const social = profile.social || { followers: 0, following: 0, iFollow: false };

  return (
    <Shell>
      {seo}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <LevelBadge level={level.level} pct={level.pct} />
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 inline-block -rotate-1 break-all">{profile.username}</span>
              </h1>
              {profile.title && <p className="font-mono text-sm font-black uppercase mt-3 text-pink-600 dark:text-pink-400 break-words"><span aria-hidden="true">✦</span> {profile.title}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {(profile.seasonTitles || []).map(t => (
                  <Tag key={`${t.season}-${t.rank}`} className={t.rank === 1 ? 'bg-yellow-300' : t.rank === 2 ? 'bg-gray-200' : t.rank === 3 ? 'bg-orange-300' : 'bg-white'}><span aria-hidden="true">🏁</span> {t.title}</Tag>
                ))}
                {profile.streak.current > 1 && <Tag className="bg-orange-300"><span aria-hidden="true">🔥</span> {profile.streak.current} day streak</Tag>}
              </div>
              <p className="font-mono text-[11px] font-bold mt-2 text-gray-500 dark:text-yellow-400/60">
                {level.xp.toLocaleString()} XP · {Math.max(0, level.next - level.xp).toLocaleString()} to level {level.level + 1}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <FollowButton
              username={profile.username}
              following={social.iFollow}
              onChange={(following, counts) => setProfile(p => p ? { ...p, social: { ...counts, iFollow: following } } : p)}
            />
            <Btn
              className="text-xs py-1"
              onClick={async () => setCopied(await copyText(window.location.href))}
              aria-label={`Copy a link to ${profile.username}'s profile`}
              title={`Copy a link to ${profile.username}'s profile`}
            >
              {copied ? '✓ Copied' : <><span aria-hidden="true">🔗</span> Copy profile link</>}
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" aria-expanded={list?.kind === 'followers'} onClick={() => openList('followers')} className={`font-mono text-sm font-black border-2 border-black dark:border-yellow-400 px-3 py-1 ${list?.kind === 'followers' ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'}`}>
            {social.followers} follower{social.followers === 1 ? '' : 's'}
          </button>
          <button type="button" aria-expanded={list?.kind === 'following'} onClick={() => openList('following')} className={`font-mono text-sm font-black border-2 border-black dark:border-yellow-400 px-3 py-1 ${list?.kind === 'following' ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'}`}>
            {social.following} following
          </button>
          {profile.isMe && <Link to="/friends" className={`font-mono text-xs font-bold ${linkCls}`}>Manage friends →</Link>}
        </div>
        {list && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-2">{list.kind === 'followers' ? 'Followers' : 'Following'}</p>
            {list.rows === null ? (
              <SkeletonBlock label="Loading the list" className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2"><Bar className="h-5 w-12 shrink-0" /><Bar className="h-4 flex-1" /></div>
                ))}
              </SkeletonBlock>
            ) : list.error ? (
              <ErrorNote message={list.error} onRetry={() => { setList(null); openList(list.kind); }} />
            ) : list.rows.length === 0 ? (
              <p className="font-mono text-sm font-bold">Nobody yet.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y-2 sm:divide-y-0 divide-black/10 dark:divide-yellow-400/10">
                {list.rows.map(p => (
                  <li key={p.username} className="py-1.5 flex items-center gap-2 min-w-0">
                    <LevelBadge level={p.level} small />
                    <Link to={`/u/${encodeURIComponent(p.username)}`} className={`font-mono text-sm font-black truncate ${linkCls}`}>{p.username}</Link>
                    {p.title && <span className="font-mono text-[10px] uppercase font-bold text-gray-500 dark:text-yellow-400/60 truncate">{p.title}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Best WPM', value: profile.summary.bestWpm },
            { label: 'Avg WPM', value: profile.summary.avgWpm },
            { label: 'Accuracy', value: `${profile.summary.avgAccuracy}%` },
            { label: 'Passages', value: profile.summary.games },
          ].map(t => (
            <Panel key={t.label}>
              <p className="font-black uppercase text-xs tracking-widest">{t.label}</p>
              <p className="font-mono text-3xl sm:text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.value}</p>
            </Panel>
          ))}
          {rating.games > 0 && (
            <Panel className="bg-purple-100 dark:bg-black">
              <p className="font-black uppercase text-xs tracking-widest"><span aria-hidden="true">⚔️</span> Rating</p>
              <p className="font-mono text-3xl sm:text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{rating.value}</p>
              <p className="font-mono text-xs font-bold mt-1">{rating.wins}W – {rating.losses}L · {rating.games} duels</p>
            </Panel>
          )}
          {(profile.arcade?.meteorBest || 0) > 0 && (
            <Panel className="bg-cyan-100 dark:bg-black">
              <p className="font-black uppercase text-xs tracking-widest"><span aria-hidden="true">☄️</span> Meteor best</p>
              <p className="font-mono text-3xl sm:text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{profile.arcade!.meteorBest.toLocaleString()}</p>
            </Panel>
          )}
        </div>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-black uppercase text-xs tracking-widest"><span aria-hidden="true">🏆</span> Achievements</p>
            <span className="font-mono text-xs font-black">{unlocked.size} / {catalog.length || '…'}{profile.isMe && <> · <Link to="/progress" className={linkCls}>see all</Link></>}</span>
          </div>
          {unlockedDefs.length === 0 ? (
            <p className="font-mono text-sm font-bold">{unlocked.size === 0 ? 'Nothing unlocked yet. The first passage is the first badge.' : 'Loading the badge names…'}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unlockedDefs.map(a => (
                <span
                  key={a.key}
                  title={`${a.name} — ${a.description} (+${a.xp} XP)`}
                  className="inline-flex items-center gap-1 border-2 border-black dark:border-yellow-400 bg-yellow-100 dark:bg-black px-2 py-1 font-mono text-xs font-black cursor-help"
                >
                  <span className="text-lg leading-none" aria-hidden="true">{a.icon}</span>
                  <span className="hidden sm:inline">{a.name}</span>
                  <span className="sr-only sm:hidden">{a.name}</span>
                </span>
              ))}
            </div>
          )}
        </Panel>

        {profile.history.length > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">WPM — last {profile.history.length} passages</p>
            <div
              role="img"
              aria-label={`Bar chart of the last ${profile.history.length} runs by ${profile.username}. Fastest ${maxWpm} WPM.`}
              className="flex items-end gap-[3px] h-24 border-b-2 border-black dark:border-yellow-400"
            >
              {profile.history.map((h, i) => (
                <div
                  key={i}
                  title={`${h.wpm} WPM · ${h.accuracy}%`}
                  className={`flex-1 min-w-[4px] rounded-t-[4px] ${h.wpm === maxWpm ? 'bg-pink-500 dark:bg-white' : 'bg-black dark:bg-yellow-400'}`}
                  style={{ height: `${Math.max(4, (h.wpm / maxWpm) * 100)}%` }}
                />
              ))}
            </div>
          </Panel>
        )}

        {Object.keys(profile.keyStats).length > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">Keyboard heatmap — darker red means more misses</p>
            <div className="overflow-x-auto" role="img" aria-label={describeHeatmap(profile)}>
              <KeyboardHeatmap keyStats={profile.keyStats} />
            </div>
          </Panel>
        )}

        {profile.ghosts.length > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-1"><span aria-hidden="true">👻</span> Race {profile.isMe ? 'your' : 'their'} ghosts</p>
            <p className="font-mono text-xs font-bold text-gray-500 dark:text-yellow-400/60 mb-3">Keystroke-for-keystroke replays. No account needed — click and type.</p>
            <div className="flex flex-wrap gap-3">
              {profile.ghosts.map(g => (
                <Link key={g.id} to={`/ghost/${g.id}`}>
                  <span className="inline-block border-2 border-black dark:border-yellow-400 px-3 py-2 bg-purple-100 dark:bg-black font-black hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors">
                    <span aria-hidden="true">👻</span> {g.wpm} WPM · {g.genre}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {profile.multiplayer.matches > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">Multiplayer — {profile.multiplayer.matches} matches</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.multiplayer.byMode).map(([mode, n]) => {
                const info = MODE_LIST.find(m => m.key === mode);
                return <Tag key={mode}><span aria-hidden="true">{info?.icon}</span> {info?.name || mode} ×{n}</Tag>;
              })}
            </div>
          </Panel>
        )}

        <Panel className="text-center">
          <p className="font-black uppercase mb-3">Think you type faster?</p>
          <Link to="/daily" className="inline-block w-full sm:w-auto">
            <Btn color="bg-orange-300" className="w-full text-base sm:text-lg"><span aria-hidden="true">🧟</span> Take today's Daily Apocalypse</Btn>
          </Link>
        </Panel>
      </div>
    </Shell>
  );
};

/** Same furniture as the loaded profile so nothing jumps when the data lands. */
const ProfileSkeleton: React.FC<{ name: string }> = ({ name }) => (
  <div className="max-w-4xl mx-auto space-y-6">
    <SkeletonBlock label={`Loading ${name || 'the typist'}`} className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Bar className="h-20 w-20 border-4 border-black/20 dark:border-yellow-400/20 shrink-0" />
        <div className="flex-1 min-w-[12rem] space-y-3">
          <Bar className="h-12 w-3/4 max-w-xs" />
          <Bar className="h-4 w-40" />
          <Bar className="h-4 w-52" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Panel key={i}>
            <Bar className="h-3 w-20" />
            <Bar className="h-9 w-16 mt-3" />
          </Panel>
        ))}
      </div>
      <Panel>
        <Bar className="h-3 w-48 mb-3" />
        <div className="flex items-end gap-[3px] h-24 border-b-2 border-black/20 dark:border-yellow-400/20">
          {Array.from({ length: 20 }).map((_, i) => (
            <Bar key={i} className={`flex-1 ${['h-1/3', 'h-2/3', 'h-1/2', 'h-full', 'h-3/4'][i % 5]}`} />
          ))}
        </div>
      </Panel>
      <Panel>
        <Bar className="h-3 w-56 mb-3" />
        <div className="space-y-1.5">
          {[10, 9, 7].map((n, ri) => (
            <div key={ri} className="flex gap-1.5" style={{ paddingLeft: `${ri * 14}px` }}>
              {Array.from({ length: n }).map((_, i) => <Bar key={i} className="h-9 md:h-11 w-9 md:w-11 shrink-0" />)}
            </div>
          ))}
        </div>
      </Panel>
    </SkeletonBlock>
    <p className="font-mono font-black text-center uppercase">Loading {name || 'typist'}…</p>
  </div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
          Typo<span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1">calypse</span>
        </Link>
        <div className="flex gap-2">
          <Link to="/leaderboard">
            <span className="font-black uppercase text-sm border-2 border-black dark:border-yellow-400 px-3 py-1 bg-cyan-300 dark:bg-black hidden sm:inline-block"><span aria-hidden="true">🏆</span> Ladder</span>
          </Link>
          <Link to="/daily">
            <span className="font-black uppercase text-sm border-2 border-black dark:border-yellow-400 px-3 py-1 bg-orange-300 dark:bg-black"><span aria-hidden="true">🧟</span> Daily</span>
          </Link>
        </div>
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">{children}</main>
  </div>
);

export default ProfilePage;
