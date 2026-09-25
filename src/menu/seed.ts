// Genera un local "en plena operación": mesas ocupadas, pedidos en cocina y ventas del día.
import { SWATCHES } from '../config/presets';
import { dateKey } from '../lib/date';
import type { MenuConfig, MenuItem, MenuState, Order, OrderLine, Table } from './types';
import { VENUES } from './presets';

export const MENU_VERSION = 1;

function rng(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min, pick: <T,>(a: T[]): T => a[Math.floor(next() * a.length)], chance: (p: number) => next() < p };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

let n = 0;
export const mid = (p: string) => `${p}${Date.now().toString(36)}${(++n).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export type Rand = ReturnType<typeof rng>;

/** Línea de pedido con opciones elegidas al azar (para simulación) */
export function randomLine(item: MenuItem, r: Rand): OrderLine {
  const choices: string[] = [];
  let unit = item.price;
  for (const g of item.options) {
    if (g.required || r.chance(0.35)) {
      const c = r.pick(g.choices);
      choices.push(c.name);
      unit += c.price;
    }
  }
  const notes = ['Sin cebolla', 'Sin hielo', 'Bien caliente, por favor', 'Salsas aparte', ''];
  return { id: mid('l'), itemId: item.id, name: item.name, qty: r.chance(0.2) ? 2 : 1, unitPrice: unit, choices, note: r.chance(0.12) ? r.pick(notes) : '' };
}

export function randomOrder(s: Pick<MenuState, 'items' | 'categories'>, table: Table, r: Rand, number: number, at: number): Order {
  const avail = s.items.filter((i) => i.available);
  const count = r.int(1, Math.min(5, table.seats + 1));
  const lines: OrderLine[] = [];
  for (let i = 0; i < count; i++) {
    const it = r.pick(avail);
    const same = lines.find((l) => l.itemId === it.id && !l.choices.length);
    if (same && !it.options.length) same.qty++;
    else lines.push(randomLine(it, r));
  }
  const names = ['Camila', 'Andrés', 'Valentina', 'Santiago', 'Laura', 'Juan', 'Daniela', 'Mateo', 'Sofía', 'Felipe', 'Mariana', 'Sebastián', ''];
  return { id: mid('o'), number, tableId: table.id, lines, status: 'new', createdAt: at, updatedAt: at, note: '', name: r.pick(names), paid: false };
}

export function orderTotal(o: Order) {
  return o.lines.reduce((t, l) => t + l.unitPrice * l.qty, 0);
}

export function buildMenuState(cfg: MenuConfig, now = Date.now()): MenuState {
  const preset = VENUES[cfg.type] ?? VENUES.restaurant;
  const r = rng(hash(cfg.slug + dateKey(new Date(now))));
  let k = 0;
  const id = (p: string) => `${p}${(++k).toString(36)}`;

  const categories: MenuState['categories'] = [];
  const items: MenuItem[] = [];
  if (cfg.menu?.length) {
    for (const c of cfg.menu) {
      const cat = { id: id('cat'), name: c.category, emoji: c.emoji ?? '🍽️' };
      categories.push(cat);
      for (const it of c.items)
        items.push({ id: id('it'), categoryId: cat.id, name: it.name, description: it.description ?? '', price: it.price, emoji: it.emoji ?? cat.emoji, photo: it.photo, tags: [], available: true, prepMinutes: 10, options: [] });
    }
  } else {
    for (const c of preset.categories) {
      const cat = { id: id('cat'), name: c.name, emoji: c.emoji };
      categories.push(cat);
      for (const it of c.items)
        items.push({
          id: id('it'),
          categoryId: cat.id,
          name: it.name,
          description: it.description,
          price: it.price,
          emoji: it.emoji,
          tags: it.tags ?? [],
          available: true,
          prepMinutes: it.prep,
          options: (it.options ?? []).map((g) => ({ id: id('og'), name: g.name, required: g.required, max: g.max, choices: g.choices.map(([name, price]) => ({ id: id('ch'), name, price })) })),
        });
    }
    // un producto agotado se ve real
    const soldOut = items.find((i) => !i.tags.includes('recomendado') && i.price > 10000);
    if (soldOut) soldOut.available = false;
  }

  const tables: Table[] = [];
  const total = cfg.tables ?? preset.zones.reduce((a, [, n]) => a + n, 0);
  let num = 1;
  for (const [zone, count] of preset.zones) {
    for (let i = 0; i < count && num <= total; i++) tables.push({ id: id('t'), number: num++, seats: zone === 'Barra' ? 2 : r.pick([2, 2, 4, 4, 4, 6]), zone });
  }
  while (num <= total) tables.push({ id: id('t'), number: num++, seats: 4, zone: preset.zones[0][0] });

  const state: MenuState = {
    version: MENU_VERSION,
    slug: cfg.slug,
    seededOn: dateKey(new Date(now)),
    dirty: false,
    venue: {
      name: cfg.name,
      tagline: cfg.tagline ?? preset.tagline,
      type: cfg.type,
      logo: cfg.logo,
      phone: cfg.phone ?? '',
      address: cfg.address ?? '',
      instagram: cfg.instagram ?? '',
      preparedFor: cfg.preparedFor,
      wifi: cfg.wifi ?? `${cfg.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 14)}_Clientes`,
      theme: { ...preset.theme, ...cfg.theme },
      tipPercent: 10,
    },
    categories,
    items,
    tables,
    orders: [],
    requests: [],
    nextNumber: 101,
    live: true,
  };

  const min = 60000;
  // Ventas del día: ~5 horas de servicio ya cobradas
  for (let i = 0; i < 38; i++) {
    const t = r.pick(tables);
    const at = now - r.int(90, 330) * min;
    const o = randomOrder(state, t, r, state.nextNumber++, at);
    o.status = 'delivered';
    o.paid = true;
    o.updatedAt = at + r.int(15, 30) * min;
    state.orders.push(o);
  }
  state.orders.sort((a, b) => a.createdAt - b.createdAt);
  state.orders.forEach((o, i) => (o.number = 101 + i));
  state.nextNumber = 101 + state.orders.length;

  // Servicio en curso
  const shuffled = [...tables].sort(() => r.next() - 0.5);
  const occupied = shuffled.slice(0, Math.round(tables.length * 0.6));
  const plan: { status: Order['status']; ago: [number, number] }[] = [
    { status: 'new', ago: [0, 2] },
    { status: 'new', ago: [1, 4] },
    { status: 'preparing', ago: [4, 9] },
    { status: 'preparing', ago: [6, 14] },
    { status: 'preparing', ago: [8, 18] },
    { status: 'ready', ago: [12, 20] },
    { status: 'ready', ago: [14, 24] },
  ];
  occupied.forEach((t, i) => {
    // cada mesa ocupada ya recibió algo
    const first = randomOrder(state, t, r, state.nextNumber++, now - r.int(25, 70) * min);
    first.status = 'delivered';
    first.updatedAt = first.createdAt + r.int(12, 22) * min;
    state.orders.push(first);
    const p = plan[i];
    if (p) {
      const at = now - r.int(p.ago[0], p.ago[1]) * min - r.int(0, 50) * 1000;
      const o = randomOrder(state, t, r, state.nextNumber++, at);
      o.status = p.status;
      o.updatedAt = at + (p.status === 'new' ? 0 : r.int(1, 3) * min);
      state.orders.push(o);
    }
  });
  if (occupied[occupied.length - 1]) state.requests.push({ id: id('rq'), tableId: occupied[occupied.length - 1].id, kind: 'bill', createdAt: now - 3 * min, done: false, pay: 'tarjeta', tip: 10 });
  if (occupied[occupied.length - 2]) state.requests.push({ id: id('rq'), tableId: occupied[occupied.length - 2].id, kind: 'waiter', createdAt: now - 1 * min, done: false });

  return state;
}

export const ZONE_COLORS = SWATCHES;
