import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import KeyboardHeatmap from '../components/KeyboardHeatmap';
import type { KeyStat } from '../components/KeyboardHeatmap';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { copyText } from '../share';
import { MODE_LIST } from '../multiplayer/types';

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
}

// Public typist profile - readable logged out, built to be linked from anywhere.
const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`/users/${encodeURIComponent(username || '')}/public`)
      .then(res => setProfile(res.data))
      .catch(err => setError(err?.response?.data?.error || 'Typist not found'));
  }, [username]);

  useEffect(() => {
    document.title = profile ? `${profile.username} — Typocalypse` : 'Typocalypse';
    return () => { document.title = 'Typocalypse'; };
  }, [profile]);

  if (error) {
    return (
      <Shell>
        <Panel className="max-w-md mx-auto mt-20 text-center">
          <p className="text-xl font-black uppercase mb-4">{error}</p>
          <Btn onClick={() => navigate('/')}>Home</Btn>
        </Panel>
      </Shell>
    );
  }
  if (!profile) {
    return <Shell><p className="text-center mt-20 font-mono font-black animate-pulse">LOADING TYPIST…</p></Shell>;
  }

  const maxWpm = Math.max(...profile.history.map(h => h.wpm), 1);

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 inline-block -rotate-1">{profile.username}</span>
          </h2>
          <div className="flex gap-2 items-center flex-wrap">
            {profile.streak.current > 1 && <Tag className="bg-orange-300">🔥 {profile.streak.current} day streak</Tag>}
            <Btn className="text-xs py-1" onClick={async () => setCopied(await copyText(window.location.href))}>
              {copied ? '✓ Copied' : '🔗 Copy profile link'}
            </Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Best WPM', value: profile.summary.bestWpm },
            { label: 'Avg WPM', value: profile.summary.avgWpm },
            { label: 'Accuracy', value: `${profile.summary.avgAccuracy}%` },
            { label: 'Passages', value: profile.summary.games },
          ].map(t => (
            <Panel key={t.label}>
              <p className="font-black uppercase text-xs tracking-widest">{t.label}</p>
              <p className="font-mono text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.value}</p>
            </Panel>
          ))}
        </div>

        {profile.history.length > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">WPM — last {profile.history.length} passages</p>
            <div className="flex items-end gap-[3px] h-24 border-b-2 border-black dark:border-yellow-400">
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
            <KeyboardHeatmap keyStats={profile.keyStats} />
          </Panel>
        )}

        {profile.ghosts.length > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-1">👻 Race {profile.isMe ? 'your' : 'their'} ghosts</p>
            <p className="font-mono text-xs font-bold text-gray-500 dark:text-yellow-400/60 mb-3">Keystroke-for-keystroke replays. No account needed — click and type.</p>
            <div className="flex flex-wrap gap-3">
              {profile.ghosts.map(g => (
                <Link key={g.id} to={`/ghost/${g.id}`}>
                  <span className="inline-block border-2 border-black dark:border-yellow-400 px-3 py-2 bg-purple-100 dark:bg-black font-black hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors">
                    👻 {g.wpm} WPM · {g.genre}
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
                return <Tag key={mode}>{info?.icon} {info?.name || mode} ×{n}</Tag>;
              })}
            </div>
          </Panel>
        )}

        <Panel className="text-center">
          <p className="font-black uppercase mb-3">Think you type faster?</p>
          <Link to="/daily">
            <Btn color="bg-orange-300" className="text-lg">🧟 Take today's Daily Apocalypse</Btn>
          </Link>
        </Panel>
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-black uppercase tracking-tighter">
          Typo<span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1">calypse</span>
        </Link>
        <Link to="/daily">
          <span className="font-black uppercase text-sm border-2 border-black dark:border-yellow-400 px-3 py-1 bg-orange-300 dark:bg-black">🧟 Daily</span>
        </Link>
      </div>
    </header>
    <main className="p-6 relative z-10">{children}</main>
  </div>
);

export default ProfilePage;
