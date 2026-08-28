import React, { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, Btn, TypingText, Countdown, useNow, Tag, ChatBox } from '../ui';
import type { ChatMsg } from '../ui';

interface Chapter { chapter: number; totalChapters: number; text: string; startAt: number; endsAt: number; doom: number }
interface BoardRow { userId: string; name: string; wpm: number; acc: number; done: boolean }
interface BoardData { chapter: number; board: BoardRow[]; teamScore: number; slipped: boolean; discussEndsAt: number }

const CorruptorGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ room, myId }) => {
  const [role, setRole] = useState<'crew' | 'corruptor' | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [phase, setPhase] = useState<'typing' | 'discuss' | 'vote' | 'storyvote'>('typing');
  const [board, setBoard] = useState<BoardData | null>(null);
  const [voteEndsAt, setVoteEndsAt] = useState(0);
  const [storyVote, setStoryVote] = useState<{ choices: string[]; endsAt: number } | null>(null);
  const [banner, setBanner] = useState('');
  const [doom, setDoom] = useState(0);
  const [myDeadline, setMyDeadline] = useState(0);
  const [sabotageUsed, setSabotageUsed] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const stickyRef = useRef<{ keys: string[]; until: number } | null>(null);
  const now = useNow(250);

  useEffect(() => {
    const s = getSocket();
    const onRole = (data: { role: 'crew' | 'corruptor' }) => setRole(data.role);
    const onChapter = (data: Chapter) => {
      setChapter(data); setPhase('typing'); setBoard(null); setStoryVote(null);
      setBanner(''); setDoom(data.doom); setMyDeadline(data.endsAt); setSabotageUsed(false);
    };
    const onBoard = (data: BoardData) => { setBoard(data); setPhase('discuss'); };
    const onVoteStart = (data: { endsAt: number }) => { setPhase('vote'); setVoteEndsAt(data.endsAt); };
    const onWrong = (data: { accused: string; doom: number }) => {
      setDoom(data.doom);
      setBanner(`❌ ${data.accused} was innocent — the corruptor feeds (doom ${data.doom}/3)`);
    };
    const onNoVote = () => setBanner('No one was accused');
    const onStoryVote = (data: { choices: string[]; endsAt: number }) => { setPhase('storyvote'); setStoryVote(data); };
    const onStoryChosen = (data: { choice: string; doomed: boolean; doom: number }) => {
      setStoryVote(null);
      setDoom(data.doom);
      setBanner(`${data.doomed ? '💀' : '📖'} The story took “${data.choice}”${data.doomed ? ` (doom ${data.doom}/3)` : ''}`);
    };
    const onSticky = (data: { keys: string[]; durationMs: number }) => {
      stickyRef.current = { keys: data.keys, until: Date.now() + data.durationMs };
      setBanner('⚠ YOUR KEYS FEEL… STICKY');
    };
    const onShrink = (data: { endsAt: number }) => { setMyDeadline(data.endsAt); setBanner('⚠ YOUR TIMER JUST SHRANK'); };
    const onChat = (msg: ChatMsg) => setMessages(prev => [...prev.slice(-99), msg]);
    s.on('corruptor:role', onRole);
    s.on('corruptor:chapter', onChapter);
    s.on('corruptor:board', onBoard);
    s.on('corruptor:votestart', onVoteStart);
    s.on('corruptor:wrongaccusation', onWrong);
    s.on('corruptor:novote', onNoVote);
    s.on('corruptor:storyvote', onStoryVote);
    s.on('corruptor:storychosen', onStoryChosen);
    s.on('corruptor:sticky', onSticky);
    s.on('corruptor:shrink', onShrink);
    s.on('chat:msg', onChat);
    return () => {
      s.off('corruptor:role', onRole);
      s.off('corruptor:chapter', onChapter);
      s.off('corruptor:board', onBoard);
      s.off('corruptor:votestart', onVoteStart);
      s.off('corruptor:wrongaccusation', onWrong);
      s.off('corruptor:novote', onNoVote);
      s.off('corruptor:storyvote', onStoryVote);
      s.off('corruptor:storychosen', onStoryChosen);
      s.off('corruptor:sticky', onSticky);
      s.off('corruptor:shrink', onShrink);
      s.off('chat:msg', onChat);
    };
  }, []);

  const running = !!chapter && phase === 'typing' && now >= chapter.startAt && now < myDeadline;
  const { pos, handleKey } = useTypingText(chapter?.text || '', {
    enabled: running,
    report: p => sendGameEvent('progress', p),
    keymap: (key) => {
      const sticky = stickyRef.current;
      if (sticky && Date.now() < sticky.until) {
        if (key === sticky.keys[0]) return sticky.keys[1];
        if (key === sticky.keys[1]) return sticky.keys[0];
      }
      return key;
    },
  });

  if (!role || !chapter) return <p className="text-center font-mono font-black animate-pulse mt-10">DEALING ROLES…</p>;

  const others = room.players.filter(p => p.userId !== myId);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-yellow-300 text-lg">🎭 CHAPTER {chapter.chapter}/{chapter.totalChapters}</Tag>
        <Tag className={role === 'corruptor' ? 'bg-red-300' : 'bg-green-300'}>
          {role === 'corruptor' ? 'YOU ARE THE CORRUPTOR' : 'CREW'}
        </Tag>
        <Tag className="bg-red-300">DOOM {doom}/3</Tag>
        {phase === 'typing' && running && <Countdown until={myDeadline} prefix="⏱ " />}
        {banner && <span className="font-black uppercase bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1">{banner}</span>}
      </div>

      {phase === 'typing' && (
        <>
          <TypingText text={chapter.text} pos={pos} onKeyDown={handleKey} disabled={!running} />
          {role === 'corruptor' && (
            <Panel className="border-red-500">
              <p className="font-black uppercase text-xs tracking-widest mb-2 text-red-600 dark:text-red-400">
                Sabotage — one per chapter, stay hidden
              </p>
              <div className="flex flex-wrap gap-2">
                {others.map(p => (
                  <React.Fragment key={p.userId}>
                    <Btn className="text-xs" disabled={sabotageUsed}
                      onClick={() => { setSabotageUsed(true); sendGameEvent('sabotage', { tool: 'sticky', targetId: p.userId }); }}>
                      🍯 sticky {p.name}
                    </Btn>
                    <Btn className="text-xs" disabled={sabotageUsed}
                      onClick={() => { setSabotageUsed(true); sendGameEvent('sabotage', { tool: 'shrink', targetId: p.userId }); }}>
                      ⏳ shrink {p.name}
                    </Btn>
                  </React.Fragment>
                ))}
                <Btn className="text-xs" disabled={sabotageUsed}
                  onClick={() => { setSabotageUsed(true); sendGameEvent('sabotage', { tool: 'fake' }); }}>
                  🪞 fake my accuracy
                </Btn>
              </div>
            </Panel>
          )}
        </>
      )}

      {(phase === 'discuss' || phase === 'vote') && board && (
        <div className="grid md:grid-cols-2 gap-4">
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-2">
              Chapter board — team score {board.teamScore} {board.slipped && <span className="text-red-600 dark:text-red-400">▼ SLIPPED</span>}
            </p>
            <table className="w-full font-mono text-sm">
              <tbody>
                {board.board.map(r => (
                  <tr key={r.userId} className="border-b-2 border-black/10 dark:border-yellow-400/10">
                    <td className="py-1 font-bold">{r.name}{r.userId === myId ? ' (you)' : ''}</td>
                    <td className="text-right">{r.wpm} wpm</td>
                    <td className={`text-right ${r.acc < 75 ? 'text-red-600 dark:text-red-400 font-black' : ''}`}>{r.acc}%</td>
                    <td className="text-right">{r.done ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {phase === 'discuss'
              ? <p className="font-mono text-xs font-bold mt-2 uppercase">Discuss — vote opens <Countdown until={board.discussEndsAt} /></p>
              : (
                <div className="mt-3">
                  <p className="font-black uppercase text-sm mb-2">Accuse (<Countdown until={voteEndsAt} />)</p>
                  <div className="flex flex-wrap gap-2">
                    {others.map(p => (
                      <Btn key={p.userId} color="bg-red-300" className="text-xs"
                        onClick={() => sendGameEvent('vote', { targetId: p.userId })}>
                        ☠ {p.name}
                      </Btn>
                    ))}
                    <Btn className="text-xs" onClick={() => sendGameEvent('vote', { targetId: null })}>skip</Btn>
                  </div>
                </div>
              )}
          </Panel>
          <ChatBox messages={messages} onSend={t => getSocket().emit('chat:send', { text: t })} title="ACCUSATION CHAMBER" />
        </div>
      )}

      {phase === 'storyvote' && storyVote && (
        <Panel className="text-center py-8">
          <p className="text-2xl font-black uppercase mb-1">Choose the path</p>
          <p className="font-mono text-sm mb-4">one of these leads to doom · <Countdown until={storyVote.endsAt} /></p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            {storyVote.choices.map(c => (
              <Btn key={c} color="bg-green-300" className="text-lg" onClick={() => sendGameEvent('storyvote', { choice: c })}>
                {c}
              </Btn>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
};

export default CorruptorGame;
