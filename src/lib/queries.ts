// Consultas derivadas del estado (con memo por referencia del estado)
import type { AppState, Appointment, Client, Service, Staff } from '../types';
import { dateKey } from './date';

export interface Lookup {
  client: Map<string, Client>;
  service: Map<string, Service>;
  staff: Map<string, Staff>;
  byDay: Map<string, Appointment[]>;
  byClient: Map<string, Appointment[]>;
}

const cache = new WeakMap<AppState, Lookup>();

export function lookup(s: AppState): Lookup {
  const hit = cache.get(s);
  if (hit) return hit;
  const byDay = new Map<string, Appointment[]>();
  const byClient = new Map<string, Appointment[]>();
  for (const a of s.appointments) {
    const k = a.start.slice(0, 10);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(a);
    (byClient.get(a.clientId) ?? byClient.set(a.clientId, []).get(a.clientId)!).push(a);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.start.localeCompare(b.start));
  for (const list of byClient.values()) list.sort((a, b) => a.start.localeCompare(b.start));
  const l: Lookup = {
    client: new Map(s.clients.map((c) => [c.id, c])),
    service: new Map(s.services.map((c) => [c.id, c])),
    staff: new Map(s.staff.map((c) => [c.id, c])),
    byDay,
    byClient,
  };
  cache.set(s, l);
  return l;
}

export interface ClientStats {
  visits: number;
  spent: number;
  noShows: number;
  last?: Appointment;
  next?: Appointment;
}

export function clientStats(s: AppState, clientId: string, now = new Date()): ClientStats {
  const list = lookup(s).byClient.get(clientId) ?? [];
  const nowKey = `${dateKey(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let visits = 0;
  let spent = 0;
  let noShows = 0;
  let last: Appointment | undefined;
  let next: Appointment | undefined;
  for (const a of list) {
    if (a.status === 'completed') {
      visits++;
      spent += a.price;
      last = a;
    }
    if (a.status === 'no_show') noShows++;
    if (!next && a.start >= nowKey && a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no_show') next = a;
  }
  return { visits, spent, noShows, last, next };
}

export const isActive = (a: Appointment) => a.status !== 'cancelled';
export const isRevenue = (a: Appointment) => a.status === 'completed' || a.status === 'confirmed' || a.status === 'arrived' || a.status === 'pending';
