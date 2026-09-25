// Ventas del día
import { useMemo } from 'react';
import { useMenuHelpers, useMenuState } from '../store';
import { orderTotal } from '../seed';
import { Card } from '../../components/ui';

export function Sales() {
  const s = useMenuState();
  const { money, table } = useMenuHelpers();

  const d = useMemo(() => {
    const valid = s.orders.filter((o) => o.status !== 'cancelled');
    const paid = valid.filter((o) => o.paid);
    const revenue = paid.reduce((n, o) => n + orderTotal(o), 0);
    const pending = valid.filter((o) => !o.paid).reduce((n, o) => n + orderTotal(o), 0);
    const byItem = new Map<string, { qty: number; v: number }>();
    for (const o of valid)
      for (const l of o.lines) {
        const x = byItem.get(l.itemId) ?? { qty: 0, v: 0 };
        x.qty += l.qty;
        x.v += l.qty * l.unitPrice;
        byItem.set(l.itemId, x);
      }
    const hours = new Map<number, number>();
    for (const o of valid) {
      const h = new Date(o.createdAt).getHours();
      hours.set(h, (hours.get(h) ?? 0) + orderTotal(o));
    }
    const hs = [...hours.keys()];
    const range: number[] = [];
    for (let h = Math.min(...hs); h <= Math.max(...hs); h++) range.push(h);
    const byTable = new Map<string, number>();
    for (const o of valid) byTable.set(o.tableId, (byTable.get(o.tableId) ?? 0) + orderTotal(o));
    const prep = valid.filter((o) => o.status === 'delivered').map((o) => (o.updatedAt - o.createdAt) / 60000);
    return {
      revenue,
      pending,
      count: valid.length,
      avg: valid.length ? (revenue + pending) / valid.length : 0,
      prep: prep.length ? prep.reduce((a, b) => a + b, 0) / prep.length : 0,
      top: [...byItem.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 8),
      hours: range.map((h) => ({ h, v: hours.get(h) ?? 0 })),
      tables: [...byTable.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [s.orders]);
  const maxH = Math.max(1, ...d.hours.map((x) => x.v));
  const maxTop = Math.max(1, ...d.top.map((x) => x[1].qty));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Ventas de hoy</h1>
          <p className="muted">Todo lo que entra por el QR, en tiempo real</p>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Cobrado</span>
          <span className="kpi-value tabular">{money(d.revenue)}</span>
          <span className="kpi-foot">+ {money(d.pending)} en mesas abiertas</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Pedidos</span>
          <span className="kpi-value tabular">{d.count}</span>
          <span className="kpi-foot">sin tomar pedidos a mano</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Ticket promedio</span>
          <span className="kpi-value tabular">{money(Math.round(d.avg / 100) * 100)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Tiempo a la mesa</span>
          <span className="kpi-value tabular">{Math.round(d.prep)} min</span>
          <span className="kpi-foot">promedio pedido → servido</span>
        </div>
      </div>

      <Card title="Ventas por hora" className="chart-card">
        <div className="bars-v" style={{ paddingLeft: 0 }}>
          <div className="bars-plot" style={{ ['--n' as string]: d.hours.length }}>
            {d.hours.map((x) => (
              <div key={x.h} className="bar-v-hit" title={`${x.h}:00 · ${money(x.v)}`}>
                <span className="bar-v" style={{ height: `${(x.v / maxH) * 100}%`, maxWidth: 48 }} />
                <span className="bar-x">{x.h % 12 || 12}{x.h < 12 ? 'am' : 'pm'}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid-2 gap-lg">
        <Card title="Lo más vendido hoy">
          <div className="hbars">
            {d.top.map(([id, v]) => {
              const it = s.items.find((i) => i.id === id);
              return (
                <div key={id} className="hbar" title={`${it?.name}: ${v.qty} · ${money(v.v)}`}>
                  <span className="hbar-label row gap-sm">
                    {it && <span className="item-art xs">{it.emoji}</span>} {it?.name}
                  </span>
                  <span className="hbar-track">
                    <span className="hbar-fill accent" style={{ width: `${(v.qty / maxTop) * 100}%` }} />
                  </span>
                  <span className="hbar-val tabular">{v.qty}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Mesas que más consumieron">
          <ul className="rank">
            {d.tables.map(([id, v], i) => (
              <li key={id}>
                <button>
                  <span className="rank-n">{i + 1}</span>
                  <span className="grow">
                    Mesa {table(id)?.number} <span className="muted small">· {table(id)?.zone}</span>
                  </span>
                  <strong className="tabular">{money(v)}</strong>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
