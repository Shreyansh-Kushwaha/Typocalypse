import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { SeoFor } from '../seo';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { FeedList } from '../social/FeedList';
import type { FeedRow } from '../social/FeedList';
import { FollowButton } from '../social/FollowButton';
import { LevelBadge } from '../social/LevelBadge';
import { Chip } from '../social/Chip';
import { Bar, ErrorNote, Rank, SkeletonBlock, SkeletonRows } from '../social/Skeleton';

interface Person { username: string; level: number; title: string }
interface Suggested extends Person { bestWpm: number }
interface LadderRow { rank: number; username: string; bestWpm: number; avgAccuracy: number; games: number; me: boolean }
type Period = 'weekly' | 'season' | 'all';

const linkCls = 'font-black underline decoration-2 underline-offset-2 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black';

/** Rows of avatar + name, shaped like <PersonRow>. */
const PeopleSkeleton: React.FC<{ label: string; rows?: number }> = ({ label, rows = 3 }) => (
  <SkeletonBlock label={label} className="space-y-3 py-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-2">
        <Bar className="h-5 w-12 shrink-0" />
        <Bar className="h-4 flex-1" />
        <Bar className="h-7 w-20 shrink-0" />
      </div>
    ))}
  </SkeletonBlock>
);

// Feed of the people I follow, who I follow / who to follow, and a friends-only ladder.
const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedRow[] | null>(null);
  const [feedError, setFeedError] = useState('');
  const [followingCount, setFollowingCount] = useState(0);
  const [world, setWorld] = useState<FeedRow[]>([]);
  const [following, setFollowing] = useState<Person[] | null>(null);
  const [suggested, setSuggested] = useState<Suggested[] | null>(null);
  const [peopleError, setPeopleError] = useState('');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<(Person & { iFollow: boolean }) | 'none' | null>(null);
  const [searching, setSearching] = useState(false);
  const [period, setPeriod] = useState<Period>('weekly');
  const [ladder, setLadder] = useState<LadderRow[] | null>(null);
  const [ladderError, setLadderError] = useState('');

  const loadFeed = useCallback(() => {
    setFeed(null);
    setFeedError('');
    axios.get('/feed').then(res => {
      setFeed(res.data.rows);
      setFollowingCount(res.data.following || 0);
      if (!res.data.following || res.data.rows.length === 0) {
        axios.get('/feed/global').then(g => setWorld(g.data.rows)).catch(() => {});
      }
    }).catch(() => { setFeed([]); setFeedError('The feed is not answering right now.'); });
  }, []);

  const loadPeople = useCallback(() => {
    if (!user) return;
    setFollowing(null);
    setSuggested(null);
    setPeopleError('');
    axios.get(`/social/${encodeURIComponent(user.username)}/following`)
      .then(res => setFollowing(res.data.rows))
      .catch(() => { setFollowing([]); setPeopleError('Could not load the people columns.'); });
    axios.get('/social/suggested')
      .then(res => setSuggested(res.data.rows))
      .catch(() => { setSuggested([]); setPeopleError('Could not load the people columns.'); });
  }, [user]);

  const loadLadder = useCallback(() => {
    setLadder(null);
    setLadderError('');
    axios.get('/leaderboard', { params: { scope: 'friends', period } })
      .then(res => setLadder(res.data.rows))
      .catch(() => { setLadder([]); setLadderError('Could not load the friends ladder.'); });
  }, [period]);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => { loadLadder(); }, [loadLadder]);

  // any follow / unfollow anywhere on the page refreshes every column
  const changed = () => { loadFeed(); loadPeople(); loadLadder(); };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = query.trim();
    if (!name || searching) return;
    setSearching(true);
    setFound(null);
    try {
      const res = await axios.get(`/users/${encodeURIComponent(name)}/public`);
      setFound({ username: res.data.username, level: res.data.level?.level || 1, title: res.data.title || '', iFollow: !!res.data.social?.iFollow });
    } catch {
      setFound('none');
    } finally {
      setSearching(false);
    }
  };

  const showWorld = feed !== null && !feedError && (followingCount === 0 || feed.length === 0);
  const periodWord = period === 'weekly' ? 'this week' : period === 'season' ? 'this season' : 'yet';

  return (
    <Shell onBack={() => navigate('/dashboard')}>
      <SeoFor path="/friends" />
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* (a) feed */}
        <section className="space-y-4 min-w-0">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="font-black uppercase text-xs tracking-widest">
                <span aria-hidden="true">{showWorld ? '🌍' : '📡'}</span> {showWorld ? 'The world' : 'Your feed'}
              </p>
              {feed && !showWorld && <Tag>{followingCount} followed</Tag>}
            </div>
            {feed === null ? (
              <SkeletonBlock label="Loading your feed" className="space-y-3 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Bar className="h-5 w-7 shrink-0" />
                    <Bar className="h-4 flex-1" />
                    <Bar className="h-3 w-12 shrink-0" />
                  </div>
                ))}
              </SkeletonBlock>
            ) : feedError ? (
              <ErrorNote message={feedError} onRetry={loadFeed} />
            ) : showWorld ? (
              <>
                <p className="font-mono text-xs font-bold text-gray-500 dark:text-yellow-400/60 mb-2">
                  {followingCount === 0 ? 'Nobody followed yet — here is the world. Follow a few typists to build your own feed.' : 'Your friends are quiet — here is the world.'}
                </p>
                <FeedList rows={world} emptyText="The wasteland is silent. Type something." />
              </>
            ) : (
              <FeedList rows={feed} emptyText="Your friends have not done anything yet." />
            )}
          </Panel>
        </section>

        {/* (b) people */}
        <section className="space-y-4 min-w-0">
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-2"><span aria-hidden="true">🔎</span> Find a typist</p>
            <form onSubmit={search} className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="friend-search">Search for a typist by exact username</label>
              <input
                id="friend-search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                maxLength={50}
                placeholder="exact username"
                className="flex-1 min-w-0 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black px-2 py-1 font-mono text-sm outline-none focus:shadow-[4px_4px_0px_0px_#ff007f]"
              />
              <Btn type="submit" className="text-xs py-1" aria-busy={searching} disabled={searching || !query.trim()}>
                {searching ? 'Finding…' : 'Find'}
              </Btn>
            </form>
            {found === 'none' && <p className="font-mono text-xs font-bold mt-2 text-red-600 dark:text-red-400">No typist by that name.</p>}
            {found && found !== 'none' && (
              <div className="mt-3"><PersonRow person={found} following={found.iFollow} onChange={changed} /></div>
            )}
          </Panel>

          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-2">
              <span aria-hidden="true">🫂</span> Following · {following?.length ?? '…'}
            </p>
            {following === null ? (
              <PeopleSkeleton label="Loading who you follow" />
            ) : peopleError && following.length === 0 ? (
              <ErrorNote message={peopleError} onRetry={loadPeople} />
            ) : following.length === 0 ? (
              <p className="font-mono text-sm font-bold py-3">You follow nobody yet. Pick someone below.</p>
            ) : (
              <ul className="divide-y-2 divide-black/10 dark:divide-yellow-400/10">
                {following.map(p => <li key={p.username} className="py-2"><PersonRow person={p} following onChange={changed} /></li>)}
              </ul>
            )}
          </Panel>

          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-2"><span aria-hidden="true">⚡</span> Suggested typists</p>
            <p className="font-mono text-[11px] font-bold uppercase text-gray-500 dark:text-yellow-400/60 mb-2">Fastest clean runs this week</p>
            {suggested === null ? (
              <PeopleSkeleton label="Loading suggested typists" />
            ) : peopleError && suggested.length === 0 ? (
              <ErrorNote message={peopleError} onRetry={loadPeople} />
            ) : suggested.length === 0 ? (
              <p className="font-mono text-sm font-bold py-3">Nobody new to show right now.</p>
            ) : (
              <ul className="divide-y-2 divide-black/10 dark:divide-yellow-400/10">
                {suggested.map(p => (
                  <li key={p.username} className="py-2">
                    <PersonRow person={p} right={<span className="font-mono text-xs font-black whitespace-nowrap">{p.bestWpm} WPM</span>} onChange={changed} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        {/* (c) friends ladder */}
        <section className="space-y-4 min-w-0">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="font-black uppercase text-xs tracking-widest"><span aria-hidden="true">🏆</span> Friends ladder</p>
              <div className="flex gap-1">
                {(['weekly', 'season', 'all'] as Period[]).map(p => (
                  <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
                    {p === 'weekly' ? 'Week' : p === 'season' ? 'Season' : 'All'}
                  </Chip>
                ))}
              </div>
            </div>
            {ladder === null ? (
              <SkeletonRows rows={5} label="Loading the friends ladder" />
            ) : ladderError ? (
              <ErrorNote message={ladderError} onRetry={loadLadder} />
            ) : ladder.length === 0 ? (
              <p className="font-mono text-sm font-bold py-3 break-words">
                No clean runs from you or your friends {periodWord}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <caption className="sr-only">Best clean run per friend, {periodWord}</caption>
                  <tbody>
                    {ladder.map(r => (
                      <tr key={r.username} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                        <td className="py-1 font-black w-8"><Rank rank={r.rank} /></td>
                        <td className="font-bold truncate max-w-[9rem]">
                          <Link to={`/u/${encodeURIComponent(r.username)}`} className={linkCls}>{r.username}</Link>{r.me ? ' (you)' : ''}
                        </td>
                        <td className="text-right font-black whitespace-nowrap">{r.bestWpm} wpm</td>
                        <td className="text-right text-xs">{r.avgAccuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to="/leaderboard" className="inline-block mt-3 font-mono text-xs font-bold underline">Global ladder →</Link>
          </Panel>
        </section>
      </div>
    </Shell>
  );
};

const PersonRow: React.FC<{ person: Person; following?: boolean; right?: React.ReactNode; onChange: () => void }> = ({ person, following, right, onChange }) => (
  <div className="flex items-center gap-2">
    <LevelBadge level={person.level} small />
    <div className="flex-1 min-w-0">
      <Link to={`/u/${encodeURIComponent(person.username)}`} className={`${linkCls} block truncate text-sm`}>{person.username}</Link>
      {person.title && <p className="font-mono text-[10px] uppercase font-bold text-gray-500 dark:text-yellow-400/60 truncate">{person.title}</p>}
    </div>
    {right}
    <FollowButton username={person.username} following={following} small onChange={onChange} />
  </div>
);

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
          Friends <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">&amp; Feed</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">{children}</main>
  </div>
);

export default FriendsPage;
