export type UpdateResult = 'updated' | 'latest' | 'offline' | 'unsupported';

// Build time, injected by Vite (vite.config.ts → define).
export const BUILD_TIME: string = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : '';

export function formatBuild(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

function activated(sw: ServiceWorker, timeoutMs: number): Promise<boolean> {
  if (sw.state === 'activated') return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') {
        clearTimeout(timer);
        resolve(true);
      } else if (sw.state === 'redundant') {
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
}

// Asks the service worker to look for a new build right now. The worker skips
// waiting (registerType: 'autoUpdate'), so once the new one is active a reload
// shows the new version — no need to close the app twice.
export async function checkForUpdate(timeoutMs = 30000): Promise<UpdateResult> {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'unsupported';
  try {
    await reg.update();
  } catch {
    return 'offline';
  }
  const fresh = reg.installing ?? reg.waiting;
  if (!fresh) return 'latest';
  fresh.postMessage({ type: 'SKIP_WAITING' }); // in case it got stuck waiting
  return (await activated(fresh, timeoutMs)) ? 'updated' : 'offline';
}
