// Estado del demo de restaurante. Se sincroniza entre pestañas del mismo navegador,
// así puedes tener la "cocina" en una ventana y el "celular del cliente" en otra.
import { useMemo, useSyncExternalStore } from 'react';
import type { MenuConfig, MenuState, Order, OrderStatus, PayMethod, RequestKind } from './types';
import { MENU_VERSION, buildMenuState, mid } from './seed';
import { dateKey } from '../lib/date';

let state: MenuState | null = null;
let key = '';
let cfgHash = '';
const subs = new Set<() => void>();
const history: MenuState[] = [];

const emit = () => subs.forEach((f) => f());

function save() {
  try {
    localStorage.setItem(key, JSON.stringify({ cfgHash, state }));
  } catch {
    /* sin almacenamiento: sigue en memoria */
  }
}

export function initMenu(cfg: MenuConfig) {
  key = `menu-demo:${cfg.slug}`;
  cfgHash = JSON.stringify(cfg);
  let loaded: MenuState | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw) as { cfgHash: string; state: MenuState };
      // Los pedidos tienen hora real: si el demo es de otro día se regenera
      if (p.cfgHash === cfgHash && p.state.version === MENU_VERSION && p.state.seededOn === dateKey(new Date())) loaded = p.state;
    }
  } catch {
    loaded = null;
  }
  state = loaded ?? buildMenuState(cfg);
  save();
  window.addEventListener('storage', (e) => {
    if (e.key !== key || !e.newValue) return;
    try {
      state = (JSON.parse(e.newValue) as { state: MenuState }).state;
      emit();
    } catch {
      /* ignorar */
    }
  });
}

export function resetMenu(cfg: MenuConfig) {
  state = buildMenuState(cfg);
  history.length = 0;
  save();
  emit();
}

export const getMenu = () => state!;

export function change(fn: (d: MenuState) => void, undoable = true) {
  const prev = getMenu();
  const d = structuredClone(prev);
  fn(d);
  d.dirty = true;
  if (undoable) {
    history.push(prev);
    if (history.length > 40) history.shift();
  }
  state = d;
  save();
  emit();
}

export function undoMenu(): boolean {
  const h = history.pop();
  if (!h) return false;
  state = h;
  save();
  emit();
  return true;
}

export function useMenuState() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    getMenu,
  );
}

// ── acciones ─────────────────────────────────────────────
export function placeOrder(o: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'status' | 'paid'>): Order {
  let created!: Order;
  change((d) => {
    const now = Date.now();
    created = { ...o, id: mid('o'), number: d.nextNumber++, createdAt: now, updatedAt: now, status: 'new', paid: false };
    d.orders.push(created);
  }, false);
  return created;
}

export function setOrderStatus(id: string, status: OrderStatus) {
  change((d) => {
    const o = d.orders.find((x) => x.id === id);
    if (o) {
      o.status = status;
      o.updatedAt = Date.now();
    }
  });
}

export function addRequest(tableId: string, kind: RequestKind, pay?: PayMethod, tip?: number) {
  change((d) => {
    if (d.requests.some((r) => r.tableId === tableId && r.kind === kind && !r.done)) return;
    d.requests.push({ id: mid('rq'), tableId, kind, createdAt: Date.now(), done: false, pay, tip });
  }, false);
}

/** Atender solicitud. Si es la cuenta, la mesa queda pagada y libre. */
export function resolveRequest(id: string) {
  change((d) => {
    const r = d.requests.find((x) => x.id === id);
    if (!r) return;
    r.done = true;
    if (r.kind === 'bill') closeTableDraft(d, r.tableId);
  });
}

function closeTableDraft(d: MenuState, tableId: string) {
  for (const o of d.orders)
    if (o.tableId === tableId && !o.paid) {
      if (o.status !== 'cancelled') o.status = 'delivered';
      o.paid = true;
      o.updatedAt = Date.now();
    }
  for (const r of d.requests) if (r.tableId === tableId) r.done = true;
}

export function closeTable(tableId: string) {
  change((d) => closeTableDraft(d, tableId));
}

export function useMenuHelpers() {
  const s = useMenuState();
  return useMemo(() => {
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
    return {
      money: (n: number) => fmt.format(n),
      clock: (ms: number) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(ms)).replace(/\s?([ap])\.?\s?m\.?/i, ' $1m'),
      table: (id: string) => s.tables.find((t) => t.id === id),
      item: (id: string) => s.items.find((i) => i.id === id),
    };
  }, [s.tables, s.items]);
}
