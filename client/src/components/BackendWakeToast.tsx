import React, { useEffect, useRef, useState } from 'react';
import { BACKEND_EVENT, backendStatus } from '../backend';
import type { BackendStatus } from '../backend';
import { sfx } from '../sound';

// Cold-start notice for the Render free tier. It appears when the API does not
// answer quickly, counts up, and stays on screen until the server responds -
// the watcher in backend.ts keeps pinging the whole time.

const STAGES = [
  { after: 0, line: 'The server sleeps after 15 minutes of quiet. Booting it now.' },
  { after: 25, line: 'Still booting. A cold start usually takes 30 to 60 seconds.' },
  { after: 60, line: 'Almost there. The first request is always the slow one.' },
  { after: 120, line: 'Taking longer than usual. Still knocking, nothing is lost.' },
  { after: 240, line: 'The server is being stubborn. This page reconnects the moment it answers.' },
];

const BackendWakeToast: React.FC = () => {
  const [status, setStatus] = useState<BackendStatus>(() => backendStatus());
  const [woke, setWoke] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const wokeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onStatus = (e: Event) => {
      const next = (e as CustomEvent<BackendStatus>).detail;
      setStatus(next);
      if (next.state === 'waking') {
        setWoke(false);
        setCollapsed(false);
      } else if (next.justWoke) {
        // flash a confirmation so a long wait ends with an obvious "go"
        setWoke(true);
        sfx.pop();
        window.clearTimeout(wokeTimer.current);
        wokeTimer.current = window.setTimeout(() => setWoke(false), 2600);
      }
    };
    window.addEventListener(BACKEND_EVENT, onStatus);
    return () => {
      window.removeEventListener(BACKEND_EVENT, onStatus);
      window.clearTimeout(wokeTimer.current);
    };
  }, []);

  const waking = status.state === 'waking';

  useEffect(() => {
    if (!waking || !status.since) return;
    const tick = () => setSeconds(Math.floor((Date.now() - status.since) / 1000));
    tick();
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, [waking, status.since]);

  if (!waking && !woke) return null;

  const stage = [...STAGES].reverse().find(s => seconds >= s.after) || STAGES[0];

  if (waking && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label={`Waking the server, ${seconds} seconds so far. Show details.`}
        className="fixed bottom-4 left-4 z-[90] flex items-center gap-2 bg-yellow-300 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15] px-3 py-2 font-mono font-black text-sm"
      >
        <span className="inline-block w-3 h-3 bg-black dark:bg-yellow-400 animate-[wakepulse_1s_ease-in-out_infinite]" />
        WAKING… {seconds}s
      </button>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[90] w-[min(92vw,380px)]"
    >
      <div
        className={`${woke ? 'bg-green-300' : 'bg-yellow-300'} dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15] p-4 animate-[toastin_0.25s_ease-out]`}
      >
        {woke ? (
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">✅</span>
            <div>
              <p className="font-black uppercase text-sm leading-tight">Server awake</p>
              <p className="font-mono text-xs font-bold mt-1 leading-snug">
                Back online after {seconds}s. Everything you opened is loading now.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none animate-[wakespin_1.6s_linear_infinite] inline-block">🛰️</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-black uppercase text-sm leading-tight">Waking the server</p>
                  <span className="font-mono font-black text-sm tabular-nums">{seconds}s</span>
                </div>
                <p className="font-mono text-xs font-bold mt-1 leading-snug">{stage.line}</p>
              </div>
            </div>

            {/* indeterminate bar - there is no real progress to report */}
            <div className="mt-3 h-3 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden">
              <div className="h-full w-1/3 bg-black dark:bg-yellow-400 animate-[wakebar_1.4s_ease-in-out_infinite]" />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold uppercase opacity-70">
                Attempt {status.attempts} · retrying until it answers
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="font-mono text-[11px] font-black uppercase border-2 border-black dark:border-yellow-400 px-2 py-0.5 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black"
              >
                Hide
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BackendWakeToast;
