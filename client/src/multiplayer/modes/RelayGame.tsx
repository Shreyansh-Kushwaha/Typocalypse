import React, { useEffect, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, Btn, TypingText, ProgressLane, useNow, Tag, Countdown } from '../ui';
import { sfx } from '../../sound';

interface Chapter {
  chapter: number;
  totalChapters: number;
  typist: { userId: string; name: string } | null;
  next: { userId: string; name: string } | null;
  text: string;
  startAt: number;
}

const RelayGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pct, setPct] = useState(0);
  const [overlap, setOverlap] = useState('');
  const [banner, setBanner] = useState('');
  const [vote, setVote] = useState<{ choices: string[]; endsAt: number } | null>(null);
  const [voted, setVoted] = useState('');
  const now = useNow(250);

  useEffect(() => {
    const s = getSocket();
    const onChapter = (data: Chapter) => {
      setChapter(data); setPct(0); setOverlap(''); setBanner(''); setVote(null); setVoted('');
    };
    const onProgress = (data: { pct: number }) => setPct(data.pct);
    const onOverlap = (data: { text: string }) => setOverlap(data.text);
    const onBatonCaught = (data: { by: string }) => { setBanner(`🤝 ${data.by} caught the baton`); sfx.pop(); };
    const onParaDone = (data: { by: string; wpm: number; acc: number }) => {
      setBanner(`¶ done — ${data.by} · ${data.wpm} wpm · ${data.acc}%`);
      sfx.success();
    };
    const onVote = (data: { choices: string[]; endsAt: number }) => setVote(data);
    const onVoted = (data: { choice: string }) => { setVote(null); setBanner(`The room chose “${data.choice}”`); };
    s.on('relay:chapter', onChapter);
    s.on('relay:progress', onProgress);
    s.on('relay:overlap', onOverlap);
    s.on('relay:batoncaught', onBatonCaught);
    s.on('relay:paradone', onParaDone);
    s.on('relay:vote', onVote);
    s.on('relay:voted', onVoted);
    return () => {
      s.off('relay:chapter', onChapter);
      s.off('relay:progress', onProgress);
      s.off('relay:overlap', onOverlap);
      s.off('relay:batoncaught', onBatonCaught);
      s.off('relay:paradone', onParaDone);
      s.off('relay:vote', onVote);
      s.off('relay:voted', onVoted);
    };
  }, []);

  const myTurn = chapter?.typist?.userId === myId;
  const imNext = chapter?.next?.userId === myId;
  const running = !!chapter && now >= chapter.startAt && myTurn && !vote;

  const main = useTypingText(chapter?.text || '', {
    enabled: running,
    report: p => sendGameEvent('progress', p),
  });
  const overlapTyping = useTypingText(overlap, {
    enabled: !!overlap && imNext,
    onDone: () => sendGameEvent('overlap-done', {}),
  });

  if (!chapter) return <p className="text-center font-mono font-black animate-pulse mt-10">OPENING THE CHRONICLE…</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-green-300 text-lg">🕯️ CHAPTER {chapter.chapter}/{chapter.totalChapters}</Tag>
        <Tag>{myTurn ? 'YOUR BATON' : `${chapter.typist?.name} HAS THE BATON`}</Tag>
        {imNext && <Tag className="bg-yellow-300">YOU ARE NEXT</Tag>}
        {banner && <span className="font-black uppercase bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1">{banner}</span>}
      </div>

      {vote ? (
        <Panel className="text-center py-8">
          <p className="text-2xl font-black uppercase mb-1">Where does the story go?</p>
          <p className="font-mono text-sm mb-4">votes weighted by your typing accuracy · <Countdown until={vote.endsAt} /></p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            {vote.choices.map(c => (
              <Btn
                key={c}
                color={voted === c ? 'bg-yellow-300' : 'bg-green-300'}
                className="text-lg"
                onClick={() => { setVoted(c); sendGameEvent('vote', { choice: c }); }}
              >
                {voted === c ? '● ' : ''}{c}
              </Btn>
            ))}
          </div>
        </Panel>
      ) : myTurn ? (
        <TypingText text={chapter.text} pos={main.pos} onKeyDown={main.handleKey} disabled={!running} />
      ) : (
        <Panel>
          <p className="font-medium text-lg mb-3 italic">“{chapter.text}”</p>
          <ProgressLane name={chapter.typist?.name || '?'} pct={pct} right={`${pct}%`} />
        </Panel>
      )}

      {overlap && imNext && !vote && (
        <Panel className="border-yellow-500">
          <p className="font-black uppercase text-xs tracking-widest mb-2 animate-pulse">🤝 Baton window — type the handoff</p>
          <TypingText text={overlap} pos={overlapTyping.pos} onKeyDown={overlapTyping.handleKey} disabled={overlapTyping.done} />
        </Panel>
      )}
    </div>
  );
};

export default RelayGame;
