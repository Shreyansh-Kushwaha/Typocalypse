import { useEffect, useState } from 'react';
import { installOfflineSync, onQueueChange, queuedCount } from '../offline/queue';

/** navigator.onLine as state, plus the offline queue length. Installs the sync listeners once. */
export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  const [queued, setQueued] = useState(() => queuedCount());
  useEffect(() => {
    installOfflineSync();
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    const off = onQueueChange(setQueued);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      off();
    };
  }, []);
  return { online, queued };
}
