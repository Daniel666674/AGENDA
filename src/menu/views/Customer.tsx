// Lo que ve el comensal al escanear el QR de su mesa.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MenuItem, OrderLine, PayMethod } from '../types';
import { addRequest, placeOrder, useMenuHelpers, useMenuState } from '../store';
import { mid, orderTotal } from '../seed';
import { track } from '../../lib/track';
import { Icon } from '../../components/Icon';
import { cx } from '../../components/ui';
import { VenueLogo, ItemArt, STATUS_STEPS, TAG_LABEL } from './shared';

type Sheet = { kind: 'item'; item: MenuItem } | { kind: 'cart' } | { kind: 'bill' } | null;

export function Customer({ tableId, embedded }: { tableId?: string; embedded?: boolean }) {
  const s = useMenuState();
  const { money } = useMenuHelpers();
  const v = s.venue;
  const table = s.tables.find((t) => t.id === tableId) ?? s.tables.find((t) => !s.orders.some((o) => o.tableId === t.id && !o.paid)) ?? s.tables[0];
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [view, setView] = useState<'menu' | 'status'>('menu');
  const [active, setActive] = useState(s.categories[0]?.id);
  const [sentId, setSentId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const myOrders = s.orders.filter((o) => o.tableId === table.id && !o.paid && o.status !== 'cancelled').sort((a, b) => b.createdAt - a.createdAt);
  const openOrder = myOrders.find((o) => o.status !== 'delivered');
  const pendingReq = (k: 'waiter' | 'bill') => s.requests.some((r) => r.tableId === table.id && r.kind === k && !r.done);
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.reduce((n, l) => n + l.qty * l.unitPrice, 0);
  const popular = useMemo(() => s.items.filter((i) => i.available && i.tags.includes('recomendado')).slice(0, 6), [s.items]);

  const toast = (t: string) => {
    setFlash(t);
    setTimeout(() => setFlash(null), 2200);
  };

  // resaltar la categoría visible
  useEffect(() => {
    const el = scroller.current;
    if (!el || view !== 'menu') return;
    const onScroll = () => {
      const secs = [...el.querySelectorAll<HTMLElement>('[data-cat]')];
      const top = el.getBoundingClientRect().top + 130;
      let cur = secs[0]?.dataset.cat;
      for (const sec of secs) if (sec.getBoundingClientRect().top <= top) cur = sec.dataset.cat;
      if (cur && cur !== active) setActive(cur);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  });

  const goCat = (id: string) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-cat="${id}"]`);
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 118, behavior: 'smooth' });
  };

  const send = (name: string, note: string) => {
    const o = placeOrder({ tableId: table.id, lines: cart, note, name });
    track('order', `Mesa ${table.number}`);
    setCart([]);
    setSheet(null);
    setSentId(o.id);
    setView('status');
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <div className={cx('qr', embedded && 'qr-embedded')}>
      <div className="qr-scroll" ref={scroller}>
        {/* Portada */}
        <header className="qr-cover">
          <span className="qr-cover-pattern" />
          <div className="qr-cover-row">
            <VenueLogo size={58} />
            <span className="qr-table-pill">
              <Icon name="pin" size={13} /> Mesa {table.number} · {table.zone}
            </span>
          </div>
        </header>
        <div className="qr-intro">
          <h1 className="display">{v.name}</h1>
          <p className="muted">{v.tagline}</p>
          <div className="qr-chips">
            {v.wifi && (
              <span>
                <Icon name="globe" size={13} /> Wi-Fi: {v.wifi}
              </span>
            )}
            {v.instagram && (
              <span>
                <Icon name="insta" size={13} /> {v.instagram}
              </span>
            )}
          </div>
        </div>

        {myOrders.length > 0 && view === 'menu' && (
          <button className="qr-live" onClick={() => setView('status')}>
            <span className="qr-live-dot" />
            <span className="grow">
              <strong>Pedido #{(openOrder ?? myOrders[0]).number}</strong> · {STATUS_STEPS.find((x) => x.status === (openOrder ?? myOrders[0]).status)?.label}
            </span>
            <span className="small">Ver estado</span>
            <Icon name="right" size={16} />
          </button>
        )}

        {view === 'menu' ? (
          <>
            <nav className="qr-tabs">
              {s.categories.map((c) => (
                <button key={c.id} className={cx(active === c.id && 'on')} onClick={() => goCat(c.id)}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </nav>

            {popular.length > 0 && (
              <section className="qr-popular">
                <h2 className="qr-h2">⭐ Lo más pedido</h2>
                <div className="qr-carousel">
                  {popular.map((it) => (
                    <button key={it.id} className="qr-pop" onClick={() => setSheet({ kind: 'item', item: it })}>
                      <ItemArt item={it} />
                      <strong>{it.name}</strong>
                      <span>{money(it.price)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {s.categories.map((c) => (
              <section key={c.id} data-cat={c.id} className="qr-section">
                <h2 className="qr-h2">
                  {c.emoji} {c.name}
                </h2>
                {s.items
                  .filter((i) => i.categoryId === c.id)
                  .map((it) => {
                    const inCart = cart.filter((l) => l.itemId === it.id).reduce((n, l) => n + l.qty, 0);
                    return (
                      <button key={it.id} className={cx('qr-item', !it.available && 'off')} disabled={!it.available} onClick={() => setSheet({ kind: 'item', item: it })}>
                        <span className="grow">
                          <strong>{it.name}</strong>
                          <span className="qr-desc">{it.description}</span>
                          <span className="qr-item-foot">
                            <b>{money(it.price)}</b>
                            {!it.available && <span className="qr-tag off">Agotado</span>}
                            {it.tags.slice(0, 2).map((tg) => (
                              <span key={tg} className={cx('qr-tag', `tag-${tg}`)}>
                                {TAG_LABEL[tg]}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span className="qr-item-art">
                          <ItemArt item={it} />
                          {it.available && <span className={cx('qr-add', inCart > 0 && 'has')}>{inCart > 0 ? inCart : <Icon name="plus" size={16} strokeWidth={2.4} />}</span>}
                        </span>
                      </button>
                    );
                  })}
              </section>
            ))}
            <p className="qr-foot muted small">Precios en pesos colombianos. La propina es voluntaria.</p>
          </>
        ) : (
          <OrderStatus tableId={table.id} highlight={sentId} onBack={() => setView('menu')} onBill={() => setSheet({ kind: 'bill' })} onWaiter={() => (addRequest(table.id, 'waiter'), toast('Un mesero va en camino 🙋'))} waiterPending={pendingReq('waiter')} billPending={pendingReq('bill')} />
        )}
      </div>

      {/* Barra inferior */}
      {view === 'menu' && (
        <div className="qr-bottom">
          {cartCount > 0 ? (
            <button className="qr-cartbar" onClick={() => setSheet({ kind: 'cart' })}>
              <span className="qr-cart-count">{cartCount}</span>
              <span className="grow">Ver mi pedido</span>
              <strong>{money(cartTotal)}</strong>
            </button>
          ) : (
            <div className="qr-actions">
              <button onClick={() => (addRequest(table.id, 'waiter'), toast('Un mesero va en camino 🙋'))} className={cx(pendingReq('waiter') && 'done')}>
                <Icon name="bell" size={17} /> {pendingReq('waiter') ? 'Mesero en camino' : 'Llamar mesero'}
              </button>
              <button onClick={() => setSheet({ kind: 'bill' })} disabled={!myOrders.length} className={cx(pendingReq('bill') && 'done')}>
                <Icon name="coin" size={17} /> {pendingReq('bill') ? 'Cuenta solicitada' : 'Pedir la cuenta'}
              </button>
            </div>
          )}
        </div>
      )}

      {sheet?.kind === 'item' && (
        <ItemSheet
          item={sheet.item}
          onClose={() => setSheet(null)}
          onAdd={(line) => {
            setCart((c) => [...c, line]);
            setSheet(null);
            toast(`Agregado: ${line.name}`);
          }}
        />
      )}
      {sheet?.kind === 'cart' && <CartSheet lines={cart} setLines={setCart} onClose={() => setSheet(null)} onSend={send} tableLabel={`Mesa ${table.number}`} />}
      {sheet?.kind === 'bill' && (
        <BillSheet
          tableId={table.id}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            toast('Listo, ya te llevamos la cuenta 🧾');
          }}
        />
      )}
      {flash && <div className="qr-flash">{flash}</div>}
    </div>
  );
}

function Sheet({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="qr-sheet-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('qr-sheet', className)}>
        <span className="qr-grab" />
        {children}
      </div>
    </div>
  );
}

function ItemSheet({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (l: OrderLine) => void }) {
  const { money } = useMenuHelpers();
  const [sel, setSel] = useState<Record<string, string[]>>(() => Object.fromEntries(item.options.filter((g) => g.required).map((g) => [g.id, [g.choices[0].id]])));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const unit = item.price + item.options.reduce((n, g) => n + g.choices.filter((c) => sel[g.id]?.includes(c.id)).reduce((a, c) => a + c.price, 0), 0);
  const toggle = (gid: string, cid: string, max: number) =>
    setSel((s) => {
      const cur = s[gid] ?? [];
      if (max === 1) return { ...s, [gid]: cur.includes(cid) && !item.options.find((g) => g.id === gid)?.required ? [] : [cid] };
      return { ...s, [gid]: cur.includes(cid) ? cur.filter((x) => x !== cid) : cur.length < max ? [...cur, cid] : cur };
    });
  return (
    <Sheet onClose={onClose} className="qr-item-sheet">
      <div className="qr-sheet-art">
        <ItemArt item={item} big />
        <button className="qr-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" size={18} />
        </button>
      </div>
      <div className="qr-sheet-body">
        <h2 className="display">{item.name}</h2>
        <p className="muted">{item.description}</p>
        <p className="qr-sheet-price">{money(item.price)}</p>
        {item.options.map((g) => (
          <fieldset key={g.id} className="qr-group">
            <legend>
              <strong>{g.name}</strong>
              <span className={cx('qr-req', g.required && 'on')}>{g.required ? 'Obligatorio' : g.max > 1 ? `Hasta ${g.max}` : 'Opcional'}</span>
            </legend>
            {g.choices.map((c) => {
              const on = sel[g.id]?.includes(c.id);
              return (
                <button key={c.id} type="button" className={cx('qr-choice', on && 'on')} onClick={() => toggle(g.id, c.id, g.max)}>
                  <span className={cx('qr-check', g.max === 1 ? 'radio' : 'box')}>{on && <Icon name="check" size={12} strokeWidth={3} />}</span>
                  <span className="grow">{c.name}</span>
                  {c.price > 0 && <span className="muted">+{money(c.price)}</span>}
                </button>
              );
            })}
          </fieldset>
        ))}
        <label className="qr-group">
          <strong>¿Alguna indicación?</strong>
          <textarea rows={2} value={note} placeholder="Ej: sin cebolla, bien asado…" onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="qr-sheet-foot">
        <div className="qr-stepper">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="menos">
            −
          </button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} aria-label="más">
            +
          </button>
        </div>
        <button
          className="qr-primary grow"
          onClick={() =>
            onAdd({
              id: mid('l'),
              itemId: item.id,
              name: item.name,
              qty,
              unitPrice: unit,
              choices: item.options.flatMap((g) => g.choices.filter((c) => sel[g.id]?.includes(c.id)).map((c) => c.name)),
              note,
            })
          }
        >
          Agregar · {money(unit * qty)}
        </button>
      </div>
    </Sheet>
  );
}

function CartSheet({ lines, setLines, onClose, onSend, tableLabel }: { lines: OrderLine[]; setLines: (f: (l: OrderLine[]) => OrderLine[]) => void; onClose: () => void; onSend: (name: string, note: string) => void; tableLabel: string }) {
  const { money } = useMenuHelpers();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const total = lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
  useEffect(() => {
    if (!lines.length) onClose();
  }, [lines.length]);
  return (
    <Sheet onClose={onClose}>
      <div className="qr-sheet-body">
        <div className="row between">
          <h2 className="display">Tu pedido</h2>
          <span className="qr-table-pill dark">{tableLabel}</span>
        </div>
        <ul className="qr-lines">
          {lines.map((l) => (
            <li key={l.id}>
              <div className="qr-stepper sm">
                <button onClick={() => setLines((ls) => ls.flatMap((x) => (x.id === l.id ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])))}>−</button>
                <span>{l.qty}</span>
                <button onClick={() => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
              </div>
              <span className="grow">
                <strong>{l.name}</strong>
                {l.choices.length > 0 && <span className="qr-desc">{l.choices.join(' · ')}</span>}
                {l.note && <span className="qr-desc">“{l.note}”</span>}
              </span>
              <b>{money(l.qty * l.unitPrice)}</b>
            </li>
          ))}
        </ul>
        <label className="qr-group">
          <strong>¿A nombre de quién?</strong>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre (opcional)" />
        </label>
        <label className="qr-group">
          <strong>Nota para la cocina</strong>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: traer todo junto" />
        </label>
        <div className="qr-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <div className="qr-sheet-foot">
        <button className="qr-primary grow" onClick={() => onSend(name.trim(), note.trim())}>
          <Icon name="check" size={18} /> Enviar a la cocina
        </button>
      </div>
    </Sheet>
  );
}

function OrderStatus({ tableId, highlight, onBack, onBill, onWaiter, waiterPending, billPending }: { tableId: string; highlight: string | null; onBack: () => void; onBill: () => void; onWaiter: () => void; waiterPending: boolean; billPending: boolean }) {
  const s = useMenuState();
  const { money, clock } = useMenuHelpers();
  const orders = s.orders.filter((o) => o.tableId === tableId && !o.paid && o.status !== 'cancelled').sort((a, b) => b.createdAt - a.createdAt);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(i);
  }, []);
  const total = orders.reduce((n, o) => n + orderTotal(o), 0);
  return (
    <div className="qr-status">
      {orders.length === 0 && (
        <div className="qr-empty">
          <span>🧾</span>
          <p>Tu cuenta está cerrada. ¡Gracias por venir!</p>
        </div>
      )}
      {orders.map((o) => {
        const idx = STATUS_STEPS.findIndex((x) => x.status === o.status);
        const eta = Math.max(...o.lines.map((l) => s.items.find((i) => i.id === l.itemId)?.prepMinutes ?? 10));
        const left = Math.max(1, Math.round(eta - (Date.now() - o.createdAt) / 60000));
        return (
          <article key={o.id} className={cx('qr-order', o.id === highlight && 'fresh')}>
            <header>
              <div>
                <span className="muted small">Pedido #{o.number} · {clock(o.createdAt)}</span>
                <h2 className="display">{STATUS_STEPS[idx]?.title}</h2>
                <p className="muted small">{o.status === 'new' || o.status === 'preparing' ? `Listo en unos ${left} min` : STATUS_STEPS[idx]?.sub}</p>
              </div>
              <span className="qr-status-emoji">{STATUS_STEPS[idx]?.emoji}</span>
            </header>
            <ol className="qr-steps">
              {STATUS_STEPS.map((st, i) => (
                <li key={st.status} className={cx(i < idx && 'done', i === idx && 'now')}>
                  <span />
                  {st.label}
                </li>
              ))}
            </ol>
            <ul className="qr-mini-lines">
              {o.lines.map((l) => (
                <li key={l.id}>
                  <span>
                    {l.qty}× {l.name}
                    {l.choices.length > 0 && <em> · {l.choices.join(', ')}</em>}
                  </span>
                  <span>{money(l.qty * l.unitPrice)}</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
      {orders.length > 0 && (
        <div className="qr-total big">
          <span>Cuenta de la mesa</span>
          <strong>{money(total)}</strong>
        </div>
      )}
      <div className="qr-status-actions">
        <button className="qr-primary" onClick={onBack}>
          <Icon name="plus" size={17} /> Pedir algo más
        </button>
        <div className="qr-actions">
          <button onClick={onWaiter} className={cx(waiterPending && 'done')}>
            <Icon name="bell" size={17} /> {waiterPending ? 'Mesero en camino' : 'Llamar mesero'}
          </button>
          <button onClick={onBill} disabled={!orders.length} className={cx(billPending && 'done')}>
            <Icon name="coin" size={17} /> {billPending ? 'Cuenta solicitada' : 'Pedir la cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAY: { id: PayMethod; label: string; emoji: string }[] = [
  { id: 'tarjeta', label: 'Tarjeta', emoji: '💳' },
  { id: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { id: 'nequi', label: 'Nequi', emoji: '📱' },
  { id: 'daviplata', label: 'Daviplata', emoji: '📲' },
];

function BillSheet({ tableId, onClose, onDone }: { tableId: string; onClose: () => void; onDone: () => void }) {
  const s = useMenuState();
  const { money } = useMenuHelpers();
  const [pay, setPay] = useState<PayMethod>('tarjeta');
  const [tip, setTip] = useState(s.venue.tipPercent);
  const orders = s.orders.filter((o) => o.tableId === tableId && !o.paid && o.status !== 'cancelled');
  const sub = orders.reduce((n, o) => n + orderTotal(o), 0);
  const tipV = Math.round((sub * tip) / 100 / 100) * 100;
  return (
    <Sheet onClose={onClose}>
      <div className="qr-sheet-body">
        <h2 className="display">La cuenta</h2>
        <ul className="qr-mini-lines">
          {orders.flatMap((o) => o.lines).map((l) => (
            <li key={l.id}>
              <span>
                {l.qty}× {l.name}
              </span>
              <span>{money(l.qty * l.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <div className="qr-sum">
          <span>Subtotal</span>
          <span>{money(sub)}</span>
        </div>
        <div className="qr-group">
          <strong>Propina voluntaria</strong>
          <div className="qr-seg">
            {[0, 10, 15].map((p) => (
              <button key={p} className={cx(tip === p && 'on')} onClick={() => setTip(p)}>
                {p ? `${p}%` : 'Sin propina'}
              </button>
            ))}
          </div>
        </div>
        <div className="qr-group">
          <strong>¿Cómo vas a pagar?</strong>
          <div className="qr-pay">
            {PAY.map((p) => (
              <button key={p.id} className={cx(pay === p.id && 'on')} onClick={() => setPay(p.id)}>
                <span>{p.emoji}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="qr-total big">
          <span>Total a pagar</span>
          <strong>{money(sub + tipV)}</strong>
        </div>
      </div>
      <div className="qr-sheet-foot">
        <button
          className="qr-primary grow"
          onClick={() => {
            addRequest(tableId, 'bill', pay, tip);
            onDone();
          }}
        >
          Pedir la cuenta
        </button>
      </div>
    </Sheet>
  );
}
