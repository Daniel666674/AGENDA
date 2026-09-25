// Seguimiento de demos: avisa cuándo un prospecto abre su demo y qué hace.
// Las visitas del propio vendedor no cuentan (el Estudio marca este navegador).
export type TrackEvent = 'open' | 'cta' | 'calc' | 'booking' | 'order';

export interface TrackInfo {
  kind: 'agenda' | 'menu';
  slug: string;
  name: string;
  seller?: string;
}

const OWNER_KEY = 'bs-owner';

export function markOwnerBrowser(on = true) {
  try {
    if (on) localStorage.setItem(OWNER_KEY, '1');
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignorar */
  }
}

export function isOwnerBrowser(): boolean {
  try {
    return localStorage.getItem(OWNER_KEY) === '1';
  } catch {
    return false;
  }
}

let current: TrackInfo | null = null;
export function setTrackContext(info: TrackInfo) {
  current = info;
}

export function track(event: TrackEvent, detail = '') {
  if (!current || isOwnerBrowser() || /^(localhost|127\.)/.test(location.hostname) || location.protocol === 'file:') return;
  const once = event === 'open' || event === 'calc';
  const key = `bs-tracked:${current.kind}:${current.slug}:${event}`;
  try {
    if (once && sessionStorage.getItem(key)) return;
    if (once) sessionStorage.setItem(key, '1');
  } catch {
    /* ignorar */
  }
  const body = JSON.stringify({ event, detail, ...current });
  try {
    fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* sin red: no pasa nada */
  }
}
