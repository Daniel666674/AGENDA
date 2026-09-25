// Router mínimo basado en el hash (#/agenda) → funciona en cualquier hosting estático
import { useSyncExternalStore } from 'react';

export type Route = 'today' | 'calendar' | 'clients' | 'services' | 'staff' | 'reports' | 'booking' | 'automations' | 'savings' | 'settings' | 'book';

function current(): { route: Route; params: URLSearchParams } {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const route = (path || 'today') as Route;
  return { route, params: new URLSearchParams(qs) };
}

let snap = current();
let key = location.hash;
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  snap = current();
  key = location.hash;
  subs.forEach((f) => f());
});

export function useRoute() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => (key === location.hash ? snap : ((snap = current()), (key = location.hash), snap)),
  );
}

export function go(route: Route, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  location.hash = `/${route}${qs}`;
}
