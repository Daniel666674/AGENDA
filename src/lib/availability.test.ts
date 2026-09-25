import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { buildState } from '../config/seed';
import { FILE_DEMOS } from '../config/registry';
import { availableSlots, findConflicts, layoutLanes, subtract } from './availability';
import { minutesOfDay, parseLocal } from './date';

// Un lunes fijo a las 08:00 para que las pruebas sean reproducibles
const MONDAY = new Date(2026, 8, 21, 8, 0);

function emptyState(): AppState {
  const s = buildState({ slug: 't', type: 'generic', name: 'Test', lang: 'es' }, MONDAY);
  s.appointments = [];
  s.blocks = [];
  return s;
}

describe('subtract', () => {
  it('parte un intervalo alrededor de un hueco', () => {
    expect(subtract([[540, 1080]], [[840, 900]])).toEqual([
      [540, 840],
      [900, 1080],
    ]);
  });
  it('ignora cortes que no se tocan', () => {
    expect(subtract([[540, 600]], [[700, 800]])).toEqual([[540, 600]]);
  });
});

describe('availableSlots', () => {
  it('respeta horario y descanso del negocio (09–18, comida 14–15)', () => {
    const s = emptyState();
    const svc = s.services[0]; // 30 min
    const slots = availableSlots(s, { service: svc, staffId: s.staff[0].id, day: '2026-09-22', now: MONDAY });
    const mins = slots.map((x) => x.minutes);
    expect(mins[0]).toBe(540);
    expect(mins).not.toContain(830); // 13:50 → cruzaría la comida
    expect(mins).toContain(810); // 13:30 termina justo a las 14:00
    expect(mins).not.toContain(840);
    expect(mins).toContain(900);
    expect(Math.max(...mins)).toBe(1050); // 17:30 es el último inicio de 30 min
  });

  it('bloquea el tiempo de citas existentes más su buffer', () => {
    const s = emptyState();
    const svc = { ...s.services[0], buffer: 15 };
    s.services[0] = svc;
    s.appointments.push({ id: 'a', clientId: s.clients[0].id, staffId: s.staff[0].id, serviceId: svc.id, start: '2026-09-22T10:00', duration: 30, price: 0, status: 'confirmed', notes: '', source: 'staff', paid: false, createdAt: '' });
    const mins = availableSlots(s, { service: svc, staffId: s.staff[0].id, day: '2026-09-22', now: MONDAY }).map((x) => x.minutes);
    expect(mins).not.toContain(600);
    expect(mins).not.toContain(630); // 10:30 aún es buffer
    expect(mins).toContain(645);
    expect(mins).not.toContain(585); // 9:45 + 30 + 15 chocaría
  });

  it('ignora citas canceladas', () => {
    const s = emptyState();
    const svc = s.services[0];
    s.appointments.push({ id: 'a', clientId: s.clients[0].id, staffId: s.staff[0].id, serviceId: svc.id, start: '2026-09-22T10:00', duration: 30, price: 0, status: 'cancelled', notes: '', source: 'staff', paid: false, createdAt: '' });
    const mins = availableSlots(s, { service: svc, staffId: s.staff[0].id, day: '2026-09-22', now: MONDAY }).map((x) => x.minutes);
    expect(mins).toContain(600);
  });

  it('respeta bloqueos y días cerrados', () => {
    const s = emptyState();
    const svc = s.services[0];
    s.blocks.push({ id: 'b', staffId: null, start: '2026-09-22T09:00', end: '2026-09-22T12:00', reason: 'x' });
    const mins = availableSlots(s, { service: svc, staffId: null, day: '2026-09-22', now: MONDAY }).map((x) => x.minutes);
    expect(Math.min(...mins)).toBe(720);
    // domingo cerrado
    expect(availableSlots(s, { service: svc, staffId: null, day: '2026-09-27', now: MONDAY })).toHaveLength(0);
  });

  it('no ofrece horarios en el pasado ni dentro de la anticipación mínima', () => {
    const s = emptyState();
    const now = new Date(2026, 8, 22, 11, 5);
    const mins = availableSlots(s, { service: s.services[0], staffId: null, day: '2026-09-22', now, leadMinutes: 60 }).map((x) => x.minutes);
    expect(Math.min(...mins)).toBe(735); // 12:15
  });

  it('con "cualquiera" agrupa a todos los profesionales libres', () => {
    const s = emptyState();
    const slots = availableSlots(s, { service: s.services[0], staffId: null, day: '2026-09-22', now: MONDAY });
    expect(slots[0].staffIds.length).toBe(s.staff.length);
  });
});

describe('findConflicts', () => {
  it('detecta cruces, horario y bloqueos', () => {
    const s = emptyState();
    const base = { clientId: s.clients[0].id, staffId: s.staff[0].id, serviceId: s.services[0].id, duration: 60 };
    s.appointments.push({ ...base, id: 'a', start: '2026-09-22T10:00', price: 0, status: 'confirmed', notes: '', source: 'staff', paid: false, createdAt: '' });
    expect(findConflicts(s, { ...base, id: 'b', start: '2026-09-22T10:30' }).map((c) => c.kind)).toContain('overlap');
    expect(findConflicts(s, { ...base, id: 'b', start: '2026-09-22T13:30' }).map((c) => c.kind)).toContain('outside');
    expect(findConflicts(s, { ...base, id: 'b', start: '2026-09-27T10:00' }).map((c) => c.kind)).toContain('closed');
    expect(findConflicts(s, { ...base, id: 'b', start: '2026-09-22T11:00' })).toEqual([]);
  });
});

describe('layoutLanes', () => {
  it('reparte citas superpuestas en carriles', () => {
    const out = layoutLanes(
      [
        [0, 60],
        [30, 90],
        [100, 120],
      ] as [number, number][],
      (x) => x,
    );
    expect(out.map((o) => [o.lane, o.lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ]);
  });
});

describe('datos demo', () => {
  it.each(FILE_DEMOS.map((d) => [d.slug, d] as const))('%s: sin citas encimadas por profesional', (_slug, cfg) => {
    const s = buildState(cfg, MONDAY);
    expect(s.appointments.length).toBeGreaterThan(200);
    const bySt = new Map<string, [number, number][]>();
    for (const a of s.appointments) {
      if (a.status === 'cancelled') continue;
      const start = parseLocal(a.start).getTime();
      const list = bySt.get(a.staffId) ?? [];
      list.push([start, start + a.duration * 60000]);
      bySt.set(a.staffId, list);
    }
    for (const list of bySt.values()) {
      list.sort((x, y) => x[0] - y[0]);
      for (let i = 1; i < list.length; i++) expect(list[i][0]).toBeGreaterThanOrEqual(list[i - 1][1]);
    }
    // todas dentro del horario del negocio
    for (const a of s.appointments) {
      const h = s.business.hours[parseLocal(a.start).getDay()];
      expect(h.open).toBe(true);
      expect(minutesOfDay(parseLocal(a.start))).toBeGreaterThanOrEqual(Number(h.start.slice(0, 2)) * 60 + Number(h.start.slice(3)));
    }
  });

  it('es determinista para el mismo día', () => {
    const a = buildState(FILE_DEMOS[0], MONDAY);
    const b = buildState(FILE_DEMOS[0], MONDAY);
    expect(a.appointments.map((x) => x.start + x.clientId)).toEqual(b.appointments.map((x) => x.start + x.clientId));
  });
});
