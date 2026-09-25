// Mapa de mesas + códigos QR imprimibles
import { useState } from 'react';
import type { Table } from '../types';
import { closeTable, useMenuHelpers, useMenuState } from '../store';
import { orderTotal } from '../seed';
import { baseLink } from '../registry';
import { QR } from '../qr';
import { Icon } from '../../components/Icon';
import { Button, Modal, Segmented, cx } from '../../components/ui';
import { VenueLogo, elapsed, useTick } from './shared';

export function tableUrl(t: Table) {
  return `${baseLink()}#/mesa/${t.number}`;
}

export function Tables() {
  useTick(15000);
  const s = useMenuState();
  const { money } = useMenuHelpers();
  const [mode, setMode] = useState<'map' | 'qr'>('map');
  const [open, setOpen] = useState<Table | null>(null);
  const zones = [...new Set(s.tables.map((t) => t.zone))];

  const info = (t: Table) => {
    const orders = s.orders.filter((o) => o.tableId === t.id && !o.paid && o.status !== 'cancelled');
    const req = s.requests.filter((r) => r.tableId === t.id && !r.done);
    const since = orders.length ? Math.min(...orders.map((o) => o.createdAt)) : 0;
    const cooking = orders.some((o) => o.status === 'new' || o.status === 'preparing');
    const ready = orders.some((o) => o.status === 'ready');
    const state = req.some((r) => r.kind === 'bill') ? 'bill' : req.some((r) => r.kind === 'waiter') ? 'waiter' : ready ? 'ready' : cooking ? 'cooking' : orders.length ? 'eating' : 'free';
    return { orders, total: orders.reduce((n, o) => n + orderTotal(o), 0), since, state };
  };

  const LABEL: Record<string, string> = { free: 'Libre', eating: 'Comiendo', cooking: 'En cocina', ready: 'Pedido listo', waiter: 'Llama al mesero', bill: 'Pide la cuenta' };
  const counts = s.tables.reduce<Record<string, number>>((m, t) => ((m[info(t).state] = (m[info(t).state] ?? 0) + 1), m), {});

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mesas</h1>
          <p className="muted">
            {s.tables.length - (counts.free ?? 0)} ocupadas de {s.tables.length} · {money(s.tables.reduce((n, t) => n + info(t).total, 0))} por cobrar
          </p>
        </div>
        <div className="page-actions">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'map', label: 'Salón' },
              { value: 'qr', label: 'Códigos QR' },
            ]}
          />
          {mode === 'qr' && (
            <Button icon="printer" onClick={() => window.print()}>
              Imprimir
            </Button>
          )}
        </div>
      </div>

      {mode === 'map' ? (
        <>
          <div className="tb-legend">
            {Object.entries(LABEL).map(([k, v]) => (
              <span key={k} className={cx('tb-leg', `tb-${k}`)}>
                <i /> {v} {counts[k] ? <b>{counts[k]}</b> : null}
              </span>
            ))}
          </div>
          {zones.map((z) => (
            <section key={z}>
              <h3 className="section-title">{z}</h3>
              <div className="tb-grid">
                {s.tables
                  .filter((t) => t.zone === z)
                  .map((t) => {
                    const i = info(t);
                    return (
                      <button key={t.id} className={cx('tb', `tb-${i.state}`)} onClick={() => setOpen(t)}>
                        <span className="tb-num">{t.number}</span>
                        <span className="tb-state">{LABEL[i.state]}</span>
                        {i.state !== 'free' ? (
                          <span className="tb-meta">
                            <b>{money(i.total)}</b>
                            <span>{elapsed(i.since).replace(/:\d\d$/, ' min')}</span>
                          </span>
                        ) : (
                          <span className="tb-meta">
                            <span>{t.seats} puestos</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="qr-cards">
          {s.tables.map((t) => (
            <div key={t.id} className="qr-card">
              <VenueLogo size={34} />
              <strong className="display">{s.venue.name}</strong>
              <span className="qr-card-hint">Escanea, pide y paga desde tu celular</span>
              <a href={tableUrl(t)} target="_blank" rel="noreferrer" className="qr-card-code">
                <QR value={tableUrl(t)} size={150} color="#16140f" />
              </a>
              <span className="qr-card-table">Mesa {t.number}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          open
          onClose={() => setOpen(null)}
          title={`Mesa ${open.number} · ${open.zone}`}
          footer={
            <>
              <a className="btn btn-ghost btn-md" href={tableUrl(open)} target="_blank" rel="noreferrer">
                <Icon name="external" size={16} /> <span>Abrir como cliente</span>
              </a>
              <span className="grow" />
              {info(open).orders.length > 0 && (
                <Button variant="primary" icon="check" onClick={() => (closeTable(open.id), setOpen(null))}>
                  Cobrar y liberar · {money(info(open).total)}
                </Button>
              )}
            </>
          }
        >
          {info(open).orders.length === 0 ? (
            <div className="tb-free-box">
              <QR value={tableUrl(open)} size={140} color="#16140f" />
              <p className="muted">Mesa libre. Este es su código QR.</p>
            </div>
          ) : (
            <ul className="qr-mini-lines staff">
              {info(open)
                .orders.flatMap((o) => o.lines.map((l) => ({ l, o })))
                .map(({ l, o }) => (
                  <li key={l.id}>
                    <span>
                      {l.qty}× {l.name}
                      {l.choices.length > 0 && <em> · {l.choices.join(', ')}</em>}
                      <span className={cx('mini-st', `st-${o.status}`)}>{o.status === 'delivered' ? 'servido' : o.status === 'ready' ? 'listo' : 'en cocina'}</span>
                    </span>
                    <span>{money(l.qty * l.unitPrice)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
