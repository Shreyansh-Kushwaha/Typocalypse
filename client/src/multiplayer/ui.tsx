import React, { useEffect, useRef, useState } from 'react';

export const brutal = {
  shadow: 'shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#facc15]',
  shadowSm: 'shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15]',
  border: 'border-4 border-black dark:border-yellow-400',
  hover: 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]',
  active: 'active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none',
};

export const Panel: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} p-4 ${className}`}>
    {children}
  </div>
);

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { color?: string }> = ({
  color = 'bg-cyan-300', className = '', children, ...props
}) => (
  <button
    {...props}
    className={`${color} dark:bg-black text-black dark:text-yellow-400 ${brutal.border} font-black uppercase px-4 py-2 transition-all ${brutal.shadowSm} ${brutal.hover} ${brutal.active} disabled:opacity-40 disabled:pointer-events-none ${className}`}
  >
    {children}
  </button>
);

export const Tag: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`font-mono text-xs font-bold border-2 border-black dark:border-yellow-400 px-2 py-0.5 uppercase ${className}`}>
    {children}
  </span>
);

/** re-render every `ms` - for countdowns */
export function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export const Countdown: React.FC<{ until: number; prefix?: string }> = ({ until, prefix = '' }) => {
  const now = useNow(250);
  const s = Math.max(0, Math.ceil((until - now) / 1000));
  return <span className="font-mono font-black">{prefix}{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
};

/** Passage renderer with typed and current char highlighting */
export const TypingText: React.FC<{
  text: string;
  pos: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string;
  disabled?: boolean;
  /** pass the hook's error count - the box shakes when it increases */
  shakeOn?: number;
}> = ({ text, pos, onKeyDown, className = '', disabled, shakeOn }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const lastShake = useRef(shakeOn ?? 0);
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, text]);
  useEffect(() => {
    if (shakeOn !== undefined && shakeOn !== lastShake.current) {
      lastShake.current = shakeOn;
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 200);
      return () => clearTimeout(t);
    }
  }, [shakeOn]);
  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`font-mono text-lg md:text-xl leading-relaxed outline-none select-none p-4 bg-white dark:bg-black ${brutal.border} ${shaking ? 'animate-[typoshake_0.2s_linear]' : ''} focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff] ${className}`}
    >
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className={
            i < pos
              ? 'text-black dark:text-black bg-green-400 font-bold'
              : i === pos
                ? 'bg-pink-500 text-white dark:bg-yellow-400 dark:text-black animate-pulse font-bold'
                : 'text-gray-400 dark:text-yellow-400/40'
          }
        >
          {ch}
        </span>
      ))}
      {!disabled && pos === 0 && (
        <div className="mt-2 font-sans text-xs font-black uppercase text-gray-500 dark:text-yellow-400/60 animate-pulse">
          Click here and type
        </div>
      )}
    </div>
  );
};

export const ProgressLane: React.FC<{ name: string; pct: number; right?: string; me?: boolean; color?: string }> = ({
  name, pct, right, me, color = 'bg-black dark:bg-yellow-400',
}) => (
  <div className="flex items-center gap-3">
    <span className={`font-mono text-sm w-28 truncate font-bold ${me ? 'text-pink-600 dark:text-yellow-400' : ''}`}>
      {me ? '▸ ' : ''}{name}
    </span>
    <div className="flex-1 h-4 border-2 border-black dark:border-yellow-400 bg-gray-100 dark:bg-black overflow-hidden">
      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
    {right && <span className="font-mono text-xs w-20 text-right font-bold">{right}</span>}
  </div>
);

export interface ChatMsg { from: string; userId: string; text: string; at: number }

export const ChatBox: React.FC<{ messages: ChatMsg[]; onSend: (text: string) => void; title?: string }> = ({
  messages, onSend, title = 'COMMS',
}) => {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  return (
    <Panel className="flex flex-col h-56">
      <p className="font-black uppercase text-xs tracking-widest mb-2">{title}</p>
      <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1">
        {messages.map((m, i) => (
          <div key={i}><span className="font-bold text-pink-600 dark:text-yellow-400">{m.from}:</span> {m.text}</div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 mt-2"
        onSubmit={e => { e.preventDefault(); if (draft.trim()) { onSend(draft); setDraft(''); } }}
      >
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="flex-1 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black px-2 py-1 font-mono text-sm outline-none"
          placeholder="say something"
          maxLength={200}
        />
        <Btn type="submit" className="text-xs py-1">Send</Btn>
      </form>
    </Panel>
  );
};
