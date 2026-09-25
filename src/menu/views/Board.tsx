// Tablero de pedidos en vivo (cocina / barra) + solicitudes de las mesas.
import type { Order, OrderStatus } from '../types';
import { resolveRequest, setOrderStatus, useMenuHelpers, useMenuState } from '../store';
import { orderTotal } from '../seed';
import { Icon } from '../../components/Icon';
import { Button, cx } from '../../components/ui';
import { elapsed, useTick } from './shared';

const COLS: { status: OrderStatus; title: string; next?: OrderStatus; action?: string; tone: string }[] = [
  { status: 'new', title: 'Nuevos', next: 'preparing', action: 'Empezar', tone: 'new' },
  { status: 'preparing', title: 'En preparación', next: 'ready', action: 'Marcar listo', tone: 'prep' },
  { status: 'ready', title: 'Listos para llevar', next: 'delivered', action: 'Entregado', tone: 'ready' },
];

export function Board() {
  useTick(1000);
  const s = useMenuState();
  const { table, clock } = useMenuHelpers();
  const reqs = s.requests.filter((r) => !r.done).sort((a, b) => a.createdAt - b.createdAt);
  const delivered = s.orders.filter((o) => o.status === 'delivered' && Date.now() - o.updatedAt < 30 * 60000).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="page kb-page">
      <div className="page-head">
        <div>
          <h1>Pedidos en vivo</h1>
          <p className="muted">
            {s.orders.filter((o) => o.status === 'new' || o.status === 'preparing').length} en cocina · {s.orders.filter((o) => o.status === 'ready').length} listos para llevar
          </p>
        </div>
      </div>

      {reqs.length > 0 && (
        <div className="kb-requests">
          {reqs.map((r) => {
            const t = table(r.tableId);
            return (
              <div key={r.id} className={cx('kb-req', r.kind)}>
                <span className="kb-req-icon">
                  <Icon name={r.kind === 'bill' ? 'coin' : 'bell'} size={18} />
                </span>
                <span className="grow">
                  <strong>
                    Mesa {t?.number} · {r.kind === 'bill' ? 'pide la cuenta' : 'llama al mesero'}
                  </strong>
                  <span className="small block">
                    hace {elapsed(r.createdAt)}
                    {r.kind === 'bill' && r.pay && ` · paga con ${r.pay}${r.tip ? ` · propina ${r.tip}%` : ''}`}
                  </span>
                </span>
                <Button size="sm" variant="primary" icon="check" onClick={() => resolveRequest(r.id)}>
                  {r.kind === 'bill' ? 'Cobrada' : 'Atendida'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="kb">
        {COLS.map((col) => {
          const list = s.orders.filter((o) => o.status === col.status).sort((a, b) => a.createdAt - b.createdAt);
          return (
            <section key={col.status} className={cx('kb-col', `kb-${col.tone}`)}>
              <header>
                <span className="kb-dot" />
                <h3>{col.title}</h3>
                <span className="kb-count">{list.length}</span>
              </header>
              <div className="kb-list">
                {list.length === 0 && <p className="kb-empty muted small">Nada por aquí 👌</p>}
                {list.map((o) => (
                  <Ticket key={o.id} o={o} col={col} />
                ))}
              </div>
            </section>
          );
        })}
        <section className="kb-col kb-done">
          <header>
            <span className="kb-dot" />
            <h3>Entregados</h3>
            <span className="kb-count">{delivered.length}</span>
          </header>
          <div className="kb-list">
            {delivered.slice(0, 12).map((o) => (
              <div key={o.id} className="kb-done-row">
                <strong>Mesa {table(o.tableId)?.number}</strong>
                <span className="muted small grow">#{o.number} · {o.lines.reduce((n, l) => n + l.qty, 0)} ítems</span>
                <span className="muted small">{clock(o.updatedAt)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Ticket({ o, col }: { o: Order; col: (typeof COLS)[number] }) {
  const { table, money } = useMenuHelpers();
  const t = table(o.tableId);
  const mins = (Date.now() - o.createdAt) / 60000;
  const late = mins > 20 ? 'late' : mins > 12 ? 'warn' : '';
  const fresh = Date.now() - o.createdAt < 20000;
  return (
    <article className={cx('ticket', late, fresh && 'fresh')}>
      <header>
        <span className="ticket-table">{t?.number}</span>
        <div className="grow">
          <strong>Mesa {t?.number}</strong>
          <span className="small muted block">
            #{o.number}
            {o.name && ` · ${o.name}`} · {t?.zone}
          </span>
        </div>
        <span className={cx('ticket-timer', late)}>
          <Icon name="clock" size={12} /> {elapsed(o.createdAt)}
        </span>
      </header>
      <ul>
        {o.lines.map((l) => (
          <li key={l.id}>
            <b>{l.qty}×</b>
            <span>
              {l.name}
              {l.choices.length > 0 && <em>{l.choices.join(' · ')}</em>}
              {l.note && <em className="ticket-note">⚠ {l.note}</em>}
            </span>
          </li>
        ))}
      </ul>
      {o.note && <p className="ticket-note small">📝 {o.note}</p>}
      <footer>
        <span className="small muted">{money(orderTotal(o))}</span>
        {col.status === 'new' && (
          <button className="icon-btn" title="Cancelar" onClick={() => setOrderStatus(o.id, 'cancelled')}>
            <Icon name="x" size={15} />
          </button>
        )}
        <Button size="sm" variant="primary" iconRight="arrow" onClick={() => col.next && setOrderStatus(o.id, col.next)}>
          {col.action}
        </Button>
      </footer>
    </article>
  );
}
