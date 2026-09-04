import React from 'react';
import { Link } from 'react-router-dom';
import { MODE_LIST } from '../multiplayer/types';
import { useNow } from '../multiplayer/ui';

export interface FeedRow {
  id: string;
  username: string;
  type: string;
  data: Record<string, any>;
  at: string;
  me?: boolean;
}

export function timeAgo(at: string | number | Date, now = Date.now()): string {
  const t = new Date(at).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(t).toLocaleDateString();
}

const linkCls = 'font-black underline decoration-2 underline-offset-2 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black';
const U: React.FC<{ name: string }> = ({ name }) => (
  <Link to={`/u/${encodeURIComponent(name)}`} className={linkCls}>{name}</Link>
);
const num = (n: unknown) => Number(n || 0).toLocaleString();

// One human-readable line per activity type. Unknown types render generically
// so a new server-side type never breaks the feed.
export function describeActivity(row: FeedRow): { icon: string; body: React.ReactNode } {
  const d = row.data || {};
  const who = <U name={row.username} />;
  switch (row.type) {
    case 'personal_best':
      return { icon: '⚡', body: <>{who} hit a new best: <b>{d.wpm} WPM</b>{d.accuracy ? ` at ${d.accuracy}%` : ''}</> };
    case 'daily':
      return { icon: '🧟', body: <>{who} placed <b>#{d.rank}</b> in Daily #{d.number} · {d.wpm} WPM</> };
    case 'achievement':
      return { icon: d.icon || '🏆', body: <>{who} unlocked <b>{d.name || d.key}</b></> };
    case 'level':
      return { icon: '⬆️', body: <>{who} reached level <b>{d.level}</b></> };
    case 'match_win': {
      const m = MODE_LIST.find(x => x.key === d.mode);
      return { icon: m?.icon || '👑', body: <>{who} won a <b>{m?.name || d.mode || 'match'}</b>{d.players ? ` against ${d.players - 1}` : ''}</> };
    }
    case 'duel': {
      const opp = d.opponent || d.against || d.vs;
      const delta = d.delta ?? d.change;
      const sign = typeof delta === 'number' ? ` (${delta >= 0 ? '+' : '−'}${Math.abs(delta)})` : '';
      return d.won === false
        ? { icon: '⚔️', body: <>{who} lost to {opp ? <U name={opp} /> : 'a rival'}{sign}</> }
        : { icon: '⚔️', body: <>{who} beat {opp ? <U name={opp} /> : 'a rival'}{sign}</> };
    }
    case 'tournament': {
      const name = d.name || d.title || 'the weekend tournament';
      if (d.won) return { icon: '🏆', body: <>{who} won <b>{name}</b></> };
      if (d.rank) return { icon: '🎟️', body: <>{who} placed <b>#{d.rank}</b> in {name}</> };
      return { icon: '🎟️', body: <>{who} entered <b>{name}</b></> };
    }
    case 'story_published':
      return {
        icon: '✍️',
        body: <>{who} published {d.storyId ? <Link to={`/library/${d.storyId}`} className={linkCls}>“{d.title}”</Link> : <b>“{d.title}”</b>}</>,
      };
    case 'meteor':
      return { icon: '☄️', body: <>{who} scored <b>{num(d.score)}</b> in Meteor Shower</> };
    case 'campaign':
      return { icon: '🔐', body: <>{who} cleared <b>{d.name || d.title || d.node || 'a campaign node'}</b></> };
    case 'season':
      return { icon: '🏁', body: <>{who}: <b>{d.title || `Season ${d.number} top ${d.rank}`}</b></> };
    case 'follow':
      return { icon: '🫂', body: <>{who} followed {d.username ? <U name={d.username} /> : 'someone'}</> };
    case 'ghost_shared':
      return {
        icon: '👻',
        body: <>{who} shared a ghost{d.wpm ? ` · ${d.wpm} WPM` : ''}{d.ghostId && <> — <Link to={`/ghost/${d.ghostId}`} className={linkCls}>race it</Link></>}</>,
      };
    default: {
      const bits = Object.entries(d)
        .filter(([, v]) => ['string', 'number'].includes(typeof v))
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      return { icon: '📌', body: <>{who} · {String(row.type).replace(/_/g, ' ')}{bits ? ` · ${bits}` : ''}</> };
    }
  }
}

export const FeedList: React.FC<{ rows: FeedRow[]; emptyText?: string; className?: string }> = ({ rows, emptyText = 'Nothing yet.', className = '' }) => {
  const now = useNow(30000);
  if (rows.length === 0) return <p className="font-mono font-bold text-sm py-6 text-center">{emptyText}</p>;
  return (
    <ul className={`divide-y-2 divide-black/10 dark:divide-yellow-400/10 ${className}`}>
      {rows.map(r => {
        const { icon, body } = describeActivity(r);
        return (
          <li key={r.id} className={`flex items-start gap-3 py-2 ${r.me ? 'bg-yellow-100 dark:bg-yellow-400/10 -mx-2 px-2' : ''}`}>
            <span className="text-xl leading-none w-7 text-center shrink-0" aria-hidden>{icon}</span>
            <span className="font-mono text-sm flex-1 min-w-0 break-words">{body}</span>
            <span className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60 shrink-0 whitespace-nowrap" title={new Date(r.at).toLocaleString()}>
              {timeAgo(r.at, now)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default FeedList;
