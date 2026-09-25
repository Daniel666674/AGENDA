// Motor de disponibilidad: horarios, descansos, bloqueos, citas existentes y buffers.
import type { AppState, Appointment, Service, Staff, WeekHours } from '../types';
import { dateKey, fromKey, minutesOfDay, overlaps, parseLocal, toMin } from './date';

export type Interval = [number, number];

/** Resta los intervalos `cut` de `base` */
export function subtract(base: Interval[], cut: Interval[]): Interval[] {
  let out = base.slice();
  for (const [c1, c2] of cut) {
    const next: Interval[] = [];
    for (const [b1, b2] of out) {
      if (!overlaps(b1, b2, c1, c2)) {
        next.push([b1, b2]);
        continue;
      }
      if (c1 > b1) next.push([b1, c1]);
      if (c2 < b2) next.push([c2, b2]);
    }
    out = next;
  }
  return out;
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [a1, a2] of a)
    for (const [b1, b2] of b) {
      const s = Math.max(a1, b1);
      const e = Math.min(a2, b2);
      if (s < e) out.push([s, e]);
    }
  return out;
}

function hoursToIntervals(hours: WeekHours, weekday: number): Interval[] {
  const h = hours[weekday];
  if (!h || !h.open) return [];
  let iv: Interval[] = [[toMin(h.start), toMin(h.end)]];
  if (h.breakStart && h.breakEnd) iv = subtract(iv, [[toMin(h.breakStart), toMin(h.breakEnd)]]);
  return iv;
}

/** Intervalos de un día (minutos) en los que un bloqueo cubre `day` */
function blockIntervals(state: AppState, staffId: string, day: string): Interval[] {
  const dayStart = fromKey(day).getTime();
  const dayEnd = dayStart + 86400000;
  const out: Interval[] = [];
  for (const b of state.blocks) {
    if (b.staffId && b.staffId !== staffId) continue;
    const s = parseLocal(b.start).getTime();
    const e = parseLocal(b.end).getTime();
    if (e <= dayStart || s >= dayEnd) continue;
    out.push([Math.max(0, (s - dayStart) / 60000), Math.min(1440, (e - dayStart) / 60000)]);
  }
  return out;
}

/** Ventanas de trabajo de un profesional en un día (ya descontando descansos y bloqueos) */
export function workingWindows(state: AppState, staff: Staff, day: string): Interval[] {
  const wd = fromKey(day).getDay();
  const biz = hoursToIntervals(state.business.hours, wd);
  const own = staff.hours ? hoursToIntervals(staff.hours, wd) : biz;
  return subtract(intersect(biz, own), blockIntervals(state, staff.id, day));
}

export function canPerform(staff: Staff, serviceId: string): boolean {
  return staff.active && (staff.serviceIds.length === 0 || staff.serviceIds.includes(serviceId));
}

const blocking = (a: Appointment) => a.status !== 'cancelled';

export function serviceBuffer(state: AppState, serviceId: string): number {
  return state.services.find((s) => s.id === serviceId)?.buffer ?? 0;
}

/** Tiempo ocupado por citas de un profesional ese día (incluye buffer) */
export function busyIntervals(state: AppState, staffId: string, day: string, excludeId?: string): Interval[] {
  return state.appointments
    .filter((a) => a.staffId === staffId && a.id !== excludeId && blocking(a) && a.start.startsWith(day))
    .map((a) => {
      const s = minutesOfDay(parseLocal(a.start));
      return [s, s + a.duration + serviceBuffer(state, a.serviceId)] as Interval;
    });
}

export interface Slot {
  minutes: number;
  staffIds: string[];
}

export interface SlotQuery {
  service: Service;
  staffId: string | null;
  day: string;
  excludeId?: string;
  /** Tiempo mínimo desde ahora (reserva online) */
  leadMinutes?: number;
  now?: Date;
  step?: number;
}

/** Horarios libres para un servicio en un día */
export function availableSlots(state: AppState, q: SlotQuery): Slot[] {
  const step = q.step ?? state.business.slotMinutes;
  const need = q.service.duration + q.service.buffer;
  const now = q.now ?? new Date();
  const todayKey = dateKey(now);
  let minStart = -1;
  if (q.day < todayKey) return [];
  if (q.day === todayKey) minStart = minutesOfDay(now) + (q.leadMinutes ?? 0);

  const staffList = state.staff.filter(
    (s) => canPerform(s, q.service.id) && (q.staffId === null || s.id === q.staffId),
  );
  const map = new Map<number, string[]>();
  for (const st of staffList) {
    const free = subtract(workingWindows(state, st, q.day), busyIntervals(state, st.id, q.day, q.excludeId));
    for (const [a, b] of free) {
      let t = Math.ceil(a / step) * step;
      for (; t + need <= b; t += step) {
        if (t < minStart) continue;
        const arr = map.get(t) ?? [];
        arr.push(st.id);
        map.set(t, arr);
      }
    }
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([minutes, staffIds]) => ({ minutes, staffIds }));
}

export type ConflictKind = 'overlap' | 'closed' | 'outside' | 'blocked' | 'skill';

export interface Conflict {
  kind: ConflictKind;
  detail?: string;
}

/** Advertencias para una cita (se permite guardarla igual desde el panel interno) */
export function findConflicts(state: AppState, a: Pick<Appointment, 'id' | 'staffId' | 'serviceId' | 'start' | 'duration' | 'clientId'>): Conflict[] {
  const out: Conflict[] = [];
  const staff = state.staff.find((s) => s.id === a.staffId);
  if (!staff) return out;
  const day = a.start.slice(0, 10);
  const s = minutesOfDay(parseLocal(a.start));
  const e = s + a.duration;

  if (!canPerform(staff, a.serviceId)) out.push({ kind: 'skill' });

  const wd = fromKey(day).getDay();
  const biz = state.business.hours[wd];
  const own = staff.hours?.[wd] ?? biz;
  if (!biz?.open || !own?.open) out.push({ kind: 'closed' });
  else {
    const windows = subtract(intersect(hoursToIntervals(state.business.hours, wd), staff.hours ? hoursToIntervals(staff.hours, wd) : [[0, 1440]]), []);
    const inside = windows.some(([w1, w2]) => s >= w1 && e <= w2);
    if (!inside) out.push({ kind: 'outside' });
  }

  const blocks = blockIntervals(state, staff.id, day);
  if (blocks.some(([b1, b2]) => overlaps(s, e, b1, b2))) out.push({ kind: 'blocked' });

  for (const o of state.appointments) {
    if (o.id === a.id || o.staffId !== a.staffId || !blocking(o) || !o.start.startsWith(day)) continue;
    const os = minutesOfDay(parseLocal(o.start));
    if (overlaps(s, e, os, os + o.duration)) {
      const c = state.clients.find((x) => x.id === o.clientId);
      out.push({ kind: 'overlap', detail: c?.name });
    }
  }
  return out;
}

/** Porcentaje de ocupación de un día (0–1) */
export function occupancy(state: AppState, day: string): number {
  let cap = 0;
  let used = 0;
  for (const st of state.staff.filter((s) => s.active)) {
    const w = workingWindows(state, st, day);
    cap += w.reduce((n, [a, b]) => n + (b - a), 0);
    used += busyIntervals(state, st.id, day).reduce((n, [a, b]) => n + (b - a), 0);
  }
  return cap ? Math.min(1, used / cap) : 0;
}

// ── Layout visual de citas superpuestas en una columna ──────────────
export interface Positioned<T> {
  item: T;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

export function layoutLanes<T>(items: T[], getRange: (t: T) => Interval): Positioned<T>[] {
  const sorted = items
    .map((item) => {
      const [start, end] = getRange(item);
      return { item, start, end, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Positioned<T>[] = [];
  let cluster: Positioned<T>[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => (c.lanes = lanes));
    out.push(...cluster);
    cluster = [];
  };
  for (const ev of sorted) {
    if (ev.start >= clusterEnd && cluster.length) flush();
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? -1, c.end);
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > ev.start) lane++;
    ev.lane = lane;
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  if (cluster.length) flush();
  return out;
}
