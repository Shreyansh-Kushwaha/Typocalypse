// Backend wake watcher.
//
// The API sleeps on Render's free tier after ~15 minutes of quiet. The first
// request then hangs or fails for 30-60 seconds while the instance boots.
// This module notices that, tells the UI to show the "waking the server"
// toast, and keeps pinging /health until the backend answers - it never gives
// up on its own. GET requests that failed while the server was asleep are
// replayed automatically once it wakes, so pages heal themselves.

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

/** How long a first health check may take before we call it a cold start. */
const GRACE_MS = 1200;
/** An in-flight request older than this means the instance is probably booting. */
const SLOW_MS = 3000;
/** Endpoints that are legitimately slow (AI generation) and never mean "asleep". */
const SLOW_EXEMPT = ['/stats/coach', '/game/', '/og/'];

export type BackendState = 'awake' | 'waking';

export interface BackendStatus {
  state: BackendState;
  /** ping attempts in the current wake-up */
  attempts: number;
  /** epoch ms the current wake-up started, 0 while awake */
  since: number;
  /** true only on the event that reports the transition back to awake */
  justWoke: boolean;
}

export const BACKEND_EVENT = 'typo:backend';

let state: BackendState = 'awake';
let attempts = 0;
let since = 0;
let polling = false;
let waiters: (() => void)[] = [];
let installed = false;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function emit(justWoke = false) {
  window.dispatchEvent(new CustomEvent<BackendStatus>(BACKEND_EVENT, {
    detail: { state, attempts, since, justWoke },
  }));
}

export function backendStatus(): BackendStatus {
  return { state, attempts, since, justWoke: false };
}

/** Resolves as soon as the backend is known to be up. Never rejects. */
export function whenAwake(): Promise<void> {
  if (state === 'awake') return Promise.resolve();
  return new Promise<void>(resolve => { waiters.push(resolve); });
}

async function ping(timeoutMs = 8000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/health`, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** The backend answered - stop polling and release anything waiting on it. */
export function noteBackendAwake() {
  const wasWaking = state === 'waking';
  polling = false;
  state = 'awake';
  attempts = 0;
  since = 0;
  if (!wasWaking) return;
  emit(true);
  const list = waiters;
  waiters = [];
  for (const resolve of list) resolve();
}

/** Something failed or is taking too long - start (or keep) waking the server. */
export function reportBackendTrouble() {
  if (polling) return;
  polling = true;
  state = 'waking';
  since = Date.now();
  attempts = 0;
  emit();
  void wakeLoop();
}

async function wakeLoop() {
  while (polling) {
    attempts += 1;
    emit();
    const ok = await ping();
    if (!polling) return;            // a real request confirmed it first
    if (ok) return noteBackendAwake();
    // hammer early, settle down later - a cold Render boot takes 30-60s
    await sleep(attempts < 5 ? 1500 : attempts < 15 ? 2500 : 4000);
  }
}

/** One check at startup. Silent when the server is already warm. */
export async function checkBackend() {
  const grace = setTimeout(reportBackendTrouble, GRACE_MS);
  const ok = await ping(6000);
  clearTimeout(grace);
  if (ok) noteBackendAwake();
  else reportBackendTrouble();
}

// ---- axios wiring -------------------------------------------------------

interface WakeConfig extends InternalAxiosRequestConfig {
  _wakeRetries?: number;
  _wakeId?: number;
}

const inflight = new Map<number, { at: number; url: string }>();
let seq = 0;

function isExempt(url = '') {
  return SLOW_EXEMPT.some(p => url.includes(p));
}

export function installBackendWatcher() {
  if (installed) return;
  installed = true;

  axios.interceptors.request.use(config => {
    const cfg = config as WakeConfig;
    cfg._wakeId = ++seq;
    inflight.set(cfg._wakeId, { at: Date.now(), url: cfg.url || '' });
    return cfg;
  });

  axios.interceptors.response.use(
    response => {
      const id = (response.config as WakeConfig)._wakeId;
      if (id) inflight.delete(id);
      noteBackendAwake();
      return response;
    },
    async (error: AxiosError) => {
      const cfg = error.config as WakeConfig | undefined;
      if (cfg?._wakeId) inflight.delete(cfg._wakeId);

      const status = error.response?.status;
      // no response at all, or a gateway error: the instance is down or booting
      const asleep = !error.response || status === 502 || status === 503 || status === 504;
      if (!asleep || !cfg) return Promise.reject(error);

      reportBackendTrouble();

      // Replay reads once the server is up. Writes are left alone so a request
      // the server may already have received is never applied twice.
      const method = (cfg.method || 'get').toLowerCase();
      const retries = cfg._wakeRetries || 0;
      if (method === 'get' && retries < 3) {
        cfg._wakeRetries = retries + 1;
        await whenAwake();
        return axios(cfg);
      }
      return Promise.reject(error);
    },
  );

  // Nothing errored yet, but a request has been hanging - that is a cold boot.
  setInterval(() => {
    if (polling) return;
    const now = Date.now();
    for (const req of inflight.values()) {
      if (now - req.at > SLOW_MS && !isExempt(req.url)) return reportBackendTrouble();
    }
  }, 700);

  // A tab coming back from the background may find the instance asleep again.
  window.addEventListener('online', () => { void checkBackend(); });

  void checkBackend();
}
