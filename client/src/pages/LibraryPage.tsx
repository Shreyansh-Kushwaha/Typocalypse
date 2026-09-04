import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { SeoFor } from '../seo';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { Chip } from '../social/Chip';
import { timeAgo } from '../social/FeedList';
import { Bar, ErrorNote, ErrorPanel, SkeletonBlock } from '../social/Skeleton';
import { sfx } from '../sound';

export interface StoryCard {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  source: 'solo' | 'relay';
  likes: number;
  plays: number;
  wordCount: number;
  passages: number;
  preview: string;
  createdAt: string;
  liked: boolean;
  isMine?: boolean;
}
interface Publishable { gameId: string; genre: string; passages: number; preview: string; updatedAt: string }
type Sort = 'new' | 'top' | 'played';

const GENRES = ['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance', 'custom'];
const GENRE_COLOR: Record<string, string> = {
  fantasy: 'bg-purple-300', horror: 'bg-red-300', 'sci-fi': 'bg-cyan-300', mystery: 'bg-orange-300',
  adventure: 'bg-green-300', romance: 'bg-pink-300', custom: 'bg-yellow-300',
};
const linkCls = 'underline decoration-2 underline-offset-2 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black';

// Public shelf of player-written stories - readable logged out, publish when logged in.
const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sort, setSort] = useState<Sort>('new');
  const [genre, setGenre] = useState('');
  const [rows, setRows] = useState<StoryCard[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shelfError, setShelfError] = useState('');
  const [mine, setMine] = useState<{ stories: StoryCard[]; publishable: Publishable[] } | null>(null);
  const [mineError, setMineError] = useState('');
  const [draft, setDraft] = useState<{ gameId: string; title: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback((p: number) => {
    if (p === 0) setLoading(true); else setLoadingMore(true);
    setShelfError('');
    axios.get('/stories', { params: { sort, genre, page: p } })
      .then(res => {
        setRows(prev => p === 0 ? res.data.rows : [...prev, ...res.data.rows]);
        setHasMore(!!res.data.hasMore);
        setPage(p);
      })
      .catch(err => {
        if (p === 0) setRows([]);
        setShelfError(err?.response?.data?.error || 'The library is not answering right now.');
      })
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, [sort, genre]);

  const loadMine = useCallback(() => {
    if (!user) { setMine(null); return; }
    setMine(null);
    setMineError('');
    axios.get('/stories/mine')
      .then(res => setMine(res.data))
      .catch(() => setMineError('Could not load your shelf.'));
  }, [user]);

  useEffect(() => { load(0); }, [load]);
  useEffect(() => { loadMine(); }, [loadMine]);

  const publish = async () => {
    if (!draft || draft.title.trim().length < 3 || publishing) return;
    setPublishing(true);
    setError('');
    try {
      await axios.post('/stories', { source: 'solo', gameId: draft.gameId, title: draft.title.trim() });
      sfx.success();
      setDraft(null);
      loadMine();
      load(0);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not publish');
    } finally {
      setPublishing(false);
    }
  };

  const filterBit = genre ? ` in ${genre}` : '';
  const sortWord = sort === 'top' ? 'liked' : sort === 'played' ? 'played' : 'published';

  return (
    <Shell user={user} onNav={navigate}>
      <SeoFor path="/library" />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {([['new', 'New'], ['top', 'Top'], ['played', 'Most played']] as [Sort, string][]).map(([k, label]) => (
            <Chip key={k} active={sort === k} onClick={() => setSort(k)} className="text-sm px-4 py-2">{label}</Chip>
          ))}
          <span className="w-px h-6 bg-black/20 dark:bg-yellow-400/30 mx-1 hidden sm:block" aria-hidden="true" />
          <Chip active={genre === ''} onClick={() => setGenre('')}>All genres</Chip>
          {GENRES.map(g => <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Chip>)}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          <section className={`space-y-4 min-w-0 ${user ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {loading && rows.length === 0 ? (
              <SkeletonBlock label="Opening the library" className={`grid grid-cols-1 gap-4 ${user ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Panel key={i} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Bar className="h-6 flex-1" />
                      <Bar className="h-5 w-16 shrink-0" />
                    </div>
                    <Bar className="h-3 w-40" />
                    <Bar className="h-4 w-full" />
                    <Bar className="h-4 w-11/12" />
                    <Bar className="h-4 w-2/3" />
                    <Bar className="h-4 w-32 mt-1" />
                  </Panel>
                ))}
              </SkeletonBlock>
            ) : shelfError && rows.length === 0 ? (
              <ErrorPanel message={shelfError} onRetry={() => load(0)} retryLabel="Reopen the library" />
            ) : rows.length === 0 ? (
              <Panel className="text-center py-10 px-4">
                <p className="text-xl sm:text-2xl font-black uppercase mb-2">
                  {genre ? `Nothing on the ${genre} shelf` : 'The shelves are empty'}
                </p>
                <p className="font-mono text-sm font-bold break-words">
                  Nothing{filterBit} has been {sortWord} yet. Finish a story and publish it — or run a Relay Chronicles room and publish the chronicle.
                </p>
              </Panel>
            ) : (
              <div className={`grid grid-cols-1 gap-4 ${user ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                {rows.map(s => <StoryCardView key={s.id} story={s} />)}
              </div>
            )}
            {shelfError && rows.length > 0 && (
              <ErrorNote message={shelfError} onRetry={() => load(page)} busy={loadingMore} />
            )}
            {hasMore && (
              <div className="text-center">
                <Btn
                  className="w-full sm:w-auto"
                  onClick={() => load(page + 1)}
                  disabled={loading || loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? 'Loading more stories…' : 'Load more'}
                </Btn>
              </div>
            )}
          </section>

          {user && (
            <aside className="space-y-4 min-w-0">
              <Panel>
                <p className="font-black uppercase text-xs tracking-widest mb-2"><span aria-hidden="true">✍️</span> Your stories</p>
                {mineError ? (
                  <ErrorNote message={mineError} onRetry={loadMine} />
                ) : !mine ? (
                  <SkeletonBlock label="Loading your stories" className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2"><Bar className="h-4 flex-1" /><Bar className="h-4 w-16 shrink-0" /></div>
                    ))}
                  </SkeletonBlock>
                ) : mine.stories.length === 0 ? (
                  <p className="font-mono text-sm font-bold">Nothing published yet. Publish a run below and it lands on the public shelf.</p>
                ) : (
                  <ul className="divide-y-2 divide-black/10 dark:divide-yellow-400/10">
                    {mine.stories.map(s => (
                      <li key={s.id} className="py-2 flex items-center gap-2">
                        <Link to={`/library/${s.id}`} className={`font-black text-sm flex-1 min-w-0 truncate ${linkCls}`}>{s.title}</Link>
                        <span className="font-mono text-xs font-bold whitespace-nowrap shrink-0">
                          <span aria-hidden="true">♥</span> <span className="sr-only">likes </span>{s.likes} · <span aria-hidden="true">▶</span> <span className="sr-only">plays </span>{s.plays}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel>
                <p className="font-black uppercase text-xs tracking-widest mb-1"><span aria-hidden="true">📜</span> Publish a run</p>
                <p className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60 mb-2">Solo stories with two or more passages can go on the shelf. Worth 40 XP.</p>
                {mineError ? null : !mine ? (
                  <SkeletonBlock label="Looking for runs you can publish" className="space-y-2">
                    <Bar className="h-16 w-full" />
                  </SkeletonBlock>
                ) : mine.publishable.length === 0 ? (
                  <p className="font-mono text-sm font-bold">No unpublished runs. <Link to="/genre-selection" className={linkCls}>Start a story</Link>.</p>
                ) : (
                  <ul className="space-y-3">
                    {mine.publishable.map(g => (
                      <li key={g.gameId} className="border-2 border-black dark:border-yellow-400 p-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Tag className={GENRE_COLOR[g.genre] || 'bg-yellow-300'}>{g.genre}</Tag>
                          <span className="font-mono text-[11px] font-bold">{g.passages} passages · {timeAgo(g.updatedAt)}</span>
                        </div>
                        <p className="font-mono text-xs text-gray-600 dark:text-yellow-400/70 line-clamp-2 break-words">{g.preview}…</p>
                        {draft?.gameId === g.gameId ? (
                          <form className="mt-2 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); publish(); }}>
                            <label className="sr-only" htmlFor={`story-title-${g.gameId}`}>Title for this story</label>
                            <input
                              id={`story-title-${g.gameId}`}
                              autoFocus
                              value={draft.title}
                              onChange={e => setDraft({ gameId: g.gameId, title: e.target.value })}
                              maxLength={80}
                              disabled={publishing}
                              placeholder="Give it a title (3-80 chars)"
                              className="flex-1 min-w-0 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black px-2 py-1 font-mono text-sm outline-none focus:shadow-[4px_4px_0px_0px_#ff007f]"
                            />
                            <Btn type="submit" color="bg-green-300" className="text-xs py-1" aria-busy={publishing} disabled={publishing || draft.title.trim().length < 3}>
                              {publishing ? 'Publishing…' : 'Go'}
                            </Btn>
                            <Btn type="button" color="bg-white" className="text-xs py-1" disabled={publishing} onClick={() => setDraft(null)} aria-label="Cancel publishing" title="Cancel publishing">✕</Btn>
                          </form>
                        ) : (
                          <Btn color="bg-green-300" className="text-xs py-1 mt-2" onClick={() => { setDraft({ gameId: g.gameId, title: '' }); setError(''); }}>Publish</Btn>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {error && <p role="alert" className="font-mono text-xs font-bold text-red-600 dark:text-red-400 mt-2 break-words">{error}</p>}
              </Panel>
            </aside>
          )}
        </div>
      </div>
    </Shell>
  );
};

export const StoryCardView: React.FC<{ story: StoryCard }> = ({ story: s }) => (
  <Panel className="flex flex-col gap-2 min-w-0 hover:translate-x-[1px] hover:translate-y-[1px] transition-transform">
    <div className="flex items-start justify-between gap-2">
      <Link to={`/library/${s.id}`} className="text-base sm:text-lg font-black uppercase leading-tight hover:underline decoration-4 underline-offset-2 break-words min-w-0">{s.title}</Link>
      <Tag className={`${GENRE_COLOR[s.genre] || 'bg-yellow-300'} shrink-0`}>{s.genre}</Tag>
    </div>
    <p className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60 break-words">
      by <Link to={`/u/${encodeURIComponent(s.authorName)}`} className={`text-black dark:text-yellow-400 ${linkCls}`}>{s.authorName}</Link>
      {s.source === 'relay' ? <> · <span aria-hidden="true">🕯️</span> relay chronicle</> : ''} · {timeAgo(s.createdAt)}
    </p>
    <p className="font-mono text-sm line-clamp-3 break-words">{s.preview}{s.preview.length >= 120 ? '…' : ''}</p>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs font-black mt-auto pt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className={s.liked ? 'text-pink-600 dark:text-pink-400' : ''}><span aria-hidden="true">♥</span> <span className="sr-only">likes </span>{s.likes}</span>
      <span><span aria-hidden="true">▶</span> <span className="sr-only">plays </span>{s.plays}</span>
      <span>{s.wordCount} words</span>
      <span>{s.passages} passages</span>
      <Link to={`/library/${s.id}`} className="ml-auto"><span className="border-2 border-black dark:border-yellow-400 px-2 py-0.5 bg-cyan-300 dark:bg-black uppercase">Read</span></Link>
    </div>
  </Panel>
);

const Shell: React.FC<{ user: { username: string } | null; onNav: (to: string) => void; children: React.ReactNode }> = ({ user, onNav, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
          Story <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Library</span>
        </h1>
        {user ? (
          <Btn color="bg-red-400" onClick={() => onNav('/dashboard')}>Dashboard</Btn>
        ) : (
          <div className="flex gap-2 items-center">
            <Link to="/" className="font-black uppercase text-sm self-center underline decoration-2 underline-offset-2">Home</Link>
            <Btn color="bg-yellow-300" onClick={() => onNav('/login')}>Login</Btn>
          </div>
        )}
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">{children}</main>
  </div>
);

export default LibraryPage;
