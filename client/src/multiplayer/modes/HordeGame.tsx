import React, { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, Btn, TypingText, Countdown, Tag, brutal } from '../ui';
import { sfx } from '../../sound';

interface Zombie { id: number; word: string; row: number; col: number; claimedBy: string | null }
interface Field { zombies: Zombie[]; hp: number; points: number; wave: number; nukes: number; remaining: number }
interface ShopData { points: number; endsAt: number; items: Record<string, { cost: number; label: string }> }

const WALL = 10;

const HordeGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [field, setField] = useState<Field>({ zombies: [], hp: 100, points: 0, wave: 1, nukes: 0, remaining: 0 });
  const [phase, setPhase] = useState<'wave' | 'shop' | 'story'>('wave');
  const [shop, setShop] = useState<ShopData | null>(null);
  const [story, setStory] = useState<{ text: string; endsAt: number } | null>(null);
  const [banner, setBanner] = useState('');
  const [buffer, setBuffer] = useState('');
  const targetRef = useRef<number | null>(null);
  const fieldRef = useRef<Field>(field);
  fieldRef.current = field;

  useEffect(() => {
    const s = getSocket();
    const onField = (data: Field) => {
      setField(data);
      if (targetRef.current != null && !data.zombies.some(z => z.id === targetRef.current)) {
        targetRef.current = null;
        setBuffer('');
      }
    };
    const onWave = (data: { wave: number }) => { setPhase('wave'); setShop(null); setStory(null); setBanner(`🌊 WAVE ${data.wave}`); sfx.go(); };
    const onShop = (data: ShopData) => { setPhase('shop'); setShop(data); targetRef.current = null; setBuffer(''); };
    const onStory = (data: { text: string; endsAt: number }) => { setPhase('story'); setStory(data); targetRef.current = null; setBuffer(''); };
    const onBreach = (data: { word: string; damage: number }) => { setBanner(`💥 “${data.word}” HIT THE WALL −${data.damage} HP`); sfx.alarm(); };
    const onKill = (data: { by: string }) => { setBanner(`🩸 ${data.by} scored a kill`); sfx.pop(); };
    const onNuked = (data: { by: string; cleared: number }) => { setBanner(`☢️ ${data.by} NUKED ${data.cleared} ZOMBIES`); sfx.alarm(); };
    const onBought = (data: { by: string; item: string }) => setBanner(`🛒 ${data.by} bought ${data.item}`);
    s.on('horde:field', onField);
    s.on('horde:wave', onWave);
    s.on('horde:shop', onShop);
    s.on('horde:story', onStory);
    s.on('horde:breach', onBreach);
    s.on('horde:kill', onKill);
    s.on('horde:nuked', onNuked);
    s.on('horde:bought', onBought);
    return () => {
      s.off('horde:field', onField);
      s.off('horde:wave', onWave);
      s.off('horde:shop', onShop);
      s.off('horde:story', onStory);
      s.off('horde:breach', onBreach);
      s.off('horde:kill', onKill);
      s.off('horde:nuked', onNuked);
      s.off('horde:bought', onBought);
    };
  }, []);

  const storyTyping = useTypingText(story?.text || '', {
    enabled: phase === 'story',
    onDone: () => sendGameEvent('progress', { done: true }),
  });

  const handleFieldKey = (e: React.KeyboardEvent) => {
    if (phase !== 'wave') return;
    const key = e.key;
    if (key === ' ') e.preventDefault();
    if (key === 'Escape') {
      if (targetRef.current != null) sendGameEvent('unclaim', { id: targetRef.current });
      targetRef.current = null;
      setBuffer('');
      return;
    }
    if (key.length > 1) return;
    const zombies = fieldRef.current.zombies;
    let target = zombies.find(z => z.id === targetRef.current);

    if (!target) {
      // First keystroke claims the deepest matching unclaimed zombie
      const candidates = zombies
        .filter(z => (!z.claimedBy || z.claimedBy === myId) && z.word.startsWith(key))
        .sort((a, b) => b.row - a.row);
      target = candidates[0];
      if (!target) return;
      targetRef.current = target.id;
      sendGameEvent('claim', { id: target.id });
      setBuffer(key);
      if (target.word === key) {
        sendGameEvent('kill', { id: target.id, word: target.word });
        targetRef.current = null;
        setBuffer('');
      }
      return;
    }

    const next = buffer + key;
    if (target.word.startsWith(next)) {
      if (target.word === next) {
        sendGameEvent('kill', { id: target.id, word: target.word });
        targetRef.current = null;
        setBuffer('');
      } else {
        setBuffer(next);
      }
    } else {
      sendGameEvent('typo', { id: target.id }); // the lurch
      setBuffer('');
    }
  };

  const hpColor = field.hp > 60 ? 'bg-green-500' : field.hp > 30 ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-green-300 text-base sm:text-lg"><span aria-hidden="true">🧟</span> WAVE {field.wave}</Tag>
        <Tag><span aria-hidden="true">☠</span> {field.zombies.length + field.remaining} LEFT</Tag>
        <Tag><span aria-hidden="true">💰</span> {field.points} PTS</Tag>
        {field.nukes > 0 && <Btn className="text-xs py-1" color="bg-red-400" onClick={() => sendGameEvent('nuke', {})}><span aria-hidden="true">☢️</span> NUKE ×{field.nukes}</Btn>}
        <span className="font-mono text-sm font-bold break-words" aria-live="polite">{banner}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="font-black uppercase text-xs sm:text-sm whitespace-nowrap">Barricade</span>
        <div className="flex-1 h-6 border-4 border-black dark:border-yellow-400 overflow-hidden bg-gray-200 dark:bg-black">
          <div className={`h-full ${hpColor} transition-all`} style={{ width: `${field.hp}%` }} />
        </div>
        <span className="font-mono font-black">{field.hp}/100</span>
      </div>

      {phase === 'wave' && (
        <div
          tabIndex={0}
          onKeyDown={handleFieldKey}
          role="group"
          aria-label="Zombie field — type a word to claim and kill that zombie, escape drops your target"
          className={`relative h-[55vh] min-h-[280px] sm:h-[420px] bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} outline-none focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff] overflow-hidden`}
        >
          {field.zombies.map(z => {
            const mine = z.id === targetRef.current;
            const typed = mine ? buffer.length : 0;
            return (
              <div
                key={z.id}
                className={`absolute font-mono text-sm md:text-base px-2 py-0.5 border-2 whitespace-nowrap transition-all duration-500 ${
                  mine
                    ? 'border-pink-500 dark:border-white bg-pink-100 dark:bg-black z-10'
                    : z.claimedBy && z.claimedBy !== myId
                      ? 'border-cyan-500 opacity-60'
                      : z.row >= WALL - 2
                        ? 'border-red-600 bg-red-100 dark:bg-red-950 animate-pulse'
                        : 'border-black dark:border-yellow-400'
                }`}
                style={{ top: `${(z.row / WALL) * 88}%`, left: `${z.col}%`, transform: 'translateX(-50%)' }}
              >
                <span aria-hidden="true">🧟</span> <span className="bg-green-400 text-black font-black">{z.word.slice(0, typed)}</span>{z.word.slice(typed)}
              </div>
            );
          })}
          <div className="absolute bottom-0 left-0 right-0 border-t-4 border-black dark:border-yellow-400 bg-[#f4f4f0] dark:bg-black text-center font-mono text-xs font-black py-1 uppercase">
            ▙▄▄▄ Barricade — click the field and type the zombies dead — esc drops your target ▄▄▄▟
          </div>
        </div>
      )}

      {phase === 'shop' && shop && (
        <Panel>
          <p className="text-xl sm:text-2xl font-black uppercase mb-1"><span aria-hidden="true">🛒</span> Between waves — spend team points</p>
          <p className="font-mono text-sm mb-4">next wave in <Countdown until={shop.endsAt} /> · pool {field.points} pts</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {Object.entries(shop.items).map(([key, item]) => (
              <Btn key={key} className="w-full sm:w-auto" disabled={field.points < item.cost} onClick={() => sendGameEvent('buy', { item: key })}>
                {item.label} — {item.cost}
              </Btn>
            ))}
          </div>
        </Panel>
      )}

      {phase === 'story' && story && (
        <div className="space-y-2">
          <p className="font-black uppercase break-words">
            <span aria-hidden="true">📖</span> Story beat — everyone finish the passage (+20 pts each) · <Countdown until={story.endsAt} />
          </p>
          <TypingText text={story.text} pos={storyTyping.pos} onKeyDown={storyTyping.handleKey} disabled={storyTyping.done} />
          {storyTyping.done && <p className="font-mono font-black animate-pulse" aria-live="polite">✓ DONE — waiting for the squad</p>}
        </div>
      )}
    </div>
  );
};

export default HordeGame;
