import React, { useEffect, useState } from 'react';
import { PROGRESSION_EVENT } from '../progression';
import type { ProgressionUpdate } from '../progression';
import { sfx } from '../sound';

interface Toast { id: number; icon: string; title: string; body: string; color: string }

// Brutalist toast stack for XP, level-ups, achievements, and cosmetic unlocks.
const ProgressionToasts: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 1;
    const push = (t: Omit<Toast, 'id'>) => {
      const id = nextId++;
      setToasts(prev => [...prev.slice(-4), { ...t, id }]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 5200);
    };
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<ProgressionUpdate>).detail;
      if (!p) return;
      if (p.gained > 0) push({ icon: '✨', title: `+${p.gained} XP`, body: `Level ${p.level} · ${p.pct}% to next`, color: 'bg-cyan-300' });
      if (p.leveledUp) { push({ icon: '⬆️', title: `LEVEL ${p.level}`, body: 'New rank reached. Check your locker.', color: 'bg-yellow-300' }); sfx.win(); }
      for (const a of p.newAchievements || []) {
        push({ icon: a.icon, title: `ACHIEVEMENT — ${a.name}`, body: `${a.description} · +${a.xp} XP`, color: 'bg-pink-300' });
        sfx.success();
      }
      for (const u of p.newUnlocks || []) {
        push({ icon: u.kind === 'theme' ? '🎨' : u.kind === 'caret' ? '▮' : '🔊', title: `UNLOCKED — ${u.name}`, body: `New ${u.kind}. Equip it in Settings or your Locker.`, color: 'bg-green-300' });
      }
    };
    window.addEventListener(PROGRESSION_EVENT, onProgress);
    return () => window.removeEventListener(PROGRESSION_EVENT, onProgress);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[min(92vw,360px)] pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`${t.color} dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15] p-3 flex items-start gap-3 animate-[toastin_0.25s_ease-out]`}>
          <span className="text-3xl leading-none">{t.icon}</span>
          <div className="min-w-0">
            <p className="font-black uppercase text-sm leading-tight">{t.title}</p>
            <p className="font-mono text-xs font-bold mt-1 leading-snug">{t.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressionToasts;
