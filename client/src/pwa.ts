// PWA plumbing: service worker registration, install prompt, online state.
//
// The service worker is registered automatically only in production builds or
// when the page is not on localhost, so `vite dev` stays uncached. The push
// flow can still call ensureServiceWorker() to register it on demand.
import { useEffect, useState } from 'react';

let deferredPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }) | null = null;
let installed = false;
const installListeners = new Set<() => void>();

function notifyInstall() {
  for (const l of installListeners) l();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as typeof deferredPrompt;
    notifyInstall();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notifyInstall();
  });
}

export function isInstalled(): boolean {
  if (installed) return true;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  } catch { /* no matchMedia */ }
  return false;
}

export function canInstall(): boolean {
  return !!deferredPrompt && !isInstalled();
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const p = deferredPrompt;
  try {
    await p.prompt();
    const choice = await p.userChoice;
    if (choice.outcome === 'accepted') { installed = true; deferredPrompt = null; }
    notifyInstall();
    return choice.outcome;
  } catch {
    return 'dismissed';
  }
}

/** Re-render when install availability changes. Returns { canInstall, installed }. */
export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick(n => n + 1);
    installListeners.add(l);
    return () => { installListeners.delete(l); };
  }, []);
  return { canInstall: canInstall(), installed: isInstalled() };
}

export function serviceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && (window.isSecureContext ?? location.protocol === 'https:');
}

function shouldAutoRegister(): boolean {
  if (!serviceWorkerSupported()) return false;
  return import.meta.env.PROD || location.hostname !== 'localhost';
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Register /sw.js (idempotent). Resolves null when unsupported. */
export function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorkerSupported()) return Promise.resolve(null);
  if (!registration) {
    registration = navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => { void reg.update().catch(() => {}); return reg; })
      .catch(err => { console.warn('Service worker registration failed:', err); registration = null; return null; });
  }
  return registration;
}

/** Called once from main.tsx. No-op in `vite dev` on localhost. */
export function registerServiceWorker() {
  if (!shouldAutoRegister()) return;
  const go = () => { void ensureServiceWorker(); };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

/** Live navigator.onLine. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

/** VAPID key (base64url) -> Uint8Array for pushManager.subscribe */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
