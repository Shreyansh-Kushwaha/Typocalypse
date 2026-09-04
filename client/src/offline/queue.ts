// Offline result queue. POST /stats/session normally; when the network is
// down the body is parked in localStorage and replayed once we are back.
import axios from 'axios';

export const QUEUE_KEY = 'typo-session-queue';
const CAP = 50;

export interface SessionBody {
  context: string;
  mode?: string;
  wpm: number;
  accuracy: number;
  errors: number;
  totalTyped: number;
  durationMs: number;
  keyStats?: Record<string, { h: number; m: number }>;
  consistency?: number;
  localHour?: number;
  won?: boolean;
}

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

function load(): SessionBody[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: SessionBody[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-CAP)));
  } catch { /* storage unavailable */ }
  for (const l of listeners) l(items.length);
}

function enqueue(body: SessionBody) {
  const items = load();
  items.push(body);
  save(items);
}

export function queuedCount(): number {
  return load().length;
}

/** Subscribe to queue size changes. Returns an unsubscribe function. */
export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** true when the request never got a response (server down, no network) */
function isNetworkError(err: unknown): boolean {
  if (isOffline()) return true;
  if (axios.isAxiosError(err)) return !err.response;
  return false;
}

/**
 * Record a finished passage. Resolves { queued: false, data } on success and
 * { queued: true } when the request could not reach the server (the body is
 * kept for flushQueue). Server-side rejections (4xx/5xx) still throw.
 */
export async function recordSession(body: SessionBody): Promise<{ queued: boolean; data?: unknown }> {
  if (isOffline()) {
    enqueue(body);
    return { queued: true };
  }
  try {
    const res = await axios.post('/stats/session', body);
    return { queued: false, data: res.data };
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue(body);
      return { queued: true };
    }
    throw err;
  }
}

let flushing: Promise<number> | null = null;

/** Replay queued results in order. Stops at the first network failure. Resolves with the number sent. */
export function flushQueue(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    try {
      for (;;) {
        const items = load();
        if (!items.length || isOffline()) break;
        const [head, ...rest] = items;
        try {
          await axios.post('/stats/session', head);
          save(rest);
          sent += 1;
        } catch (err) {
          if (isNetworkError(err)) break; // still offline - try again later
          const status = axios.isAxiosError(err) ? err.response?.status : 0;
          if (status === 401 || status === 403) break; // not signed in yet - keep it
          save(rest); // the server rejected this one for good - drop it so it cannot poison the queue
        }
      }
    } finally {
      flushing = null;
    }
    return sent;
  })();
  return flushing;
}

let installed = false;

/** Idempotent: hook the 'online' event and flush right away if we are online. */
export function installOfflineSync() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('online', () => { void flushQueue(); });
  if (!isOffline() && queuedCount() > 0) void flushQueue();
}

// Module load: flush leftovers once the auth header has had a chance to be set.
if (typeof window !== 'undefined' && !isOffline() && queuedCount() > 0) {
  setTimeout(() => {
    try {
      if (localStorage.getItem('token')) void flushQueue();
    } catch { /* storage unavailable */ }
  }, 2000);
}
