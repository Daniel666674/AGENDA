// Seguimiento: quién abrió su demo, cuántas veces y qué hizo adentro.
import { useCallback, useEffect, useState } from 'react';
import { isOwnerBrowser, markOwnerBrowser } from '../lib/track';
import { Button, Field, Toggle, cx } from '../components/ui';
import { Icon } from '../components/Icon';

interface Demo {
  key: string;
  kind: 'agenda' | 'menu';
  slug: string;
  name: string;
  seller: string;
  opens: number;
  cta: number;
  calc: number;
  booking: number;
  order: number;
  mobile: number;
  first: number;
  last: number;
  lastCta?: string;
}
interface Recent {
  at: number;
  event: string;
  kind: string;
  slug: string;
  name: string;
  device: string;
  detail: string;
}

const KEY = 'bs-track-key';
const EVENT_LABEL: Record<string, string> = {
  open: 'abrió el demo',
  cta: 'tocó "Quiero activarlo"',
  calc: 'usó la calculadora',
  booking: 'hizo una reserva de prueba',
  order: 'hizo un pedido de prueba',
};

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

function heat(d: Demo): { label: string; cls: string; tip: string } {
  const fresh = Date.now() - d.last < 48 * 3600000;
  if (d.cta > 0) return { label: 'Quiere activar', cls: 'hot', tip: 'Escríbele hoy: tocó el botón de activar' };
  if (fresh && (d.opens >= 3 || d.calc > 0)) return { label: 'Caliente', cls: 'warm', tip: 'Lo está revisando: buen momento para el seguimiento' };
  if (d.opens >= 2 || d.booking || d.order) return { label: 'Interesado', cls: 'mid', tip: 'Volvió a abrirlo o lo probó' };
  return { label: 'Lo abrió', cls: 'cold', tip: 'Abrió el enlace una vez' };
}

export function Tracking() {
  const [key, setKey] = useState(() => {
    try {
      return localStorage.getItem(KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [draft, setDraft] = useState('');
  const [data, setData] = useState<{ demos: Demo[]; recent: Recent[] } | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'badkey'>('idle');
  const [owner, setOwner] = useState(isOwnerBrowser());

  const load = useCallback(async () => {
    if (!key) return;
    setState('loading');
    try {
      const r = await fetch(`/api/stats?k=${encodeURIComponent(key)}`, { cache: 'no-store' });
      if (r.status === 401) {
        setState('badkey');
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
      setState('idle');
    } catch {
      setState('error');
    }
  }, [key]);

  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, [load]);

  if (!key || state === 'badkey')
    return (
      <div className="card track-login">
        <div className="card-body">
          <h3 className="display">Panel de seguimiento</h3>
          <p className="muted">{state === 'badkey' ? 'Esa clave no es correcta. Revísala e inténtalo otra vez.' : 'Escribe la clave de seguimiento una sola vez; queda guardada en este navegador.'}</p>
          <form
            className="row gap-sm"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                localStorage.setItem(KEY, draft.trim());
              } catch {
                /* ignorar */
              }
              setState('idle');
              setKey(draft.trim());
            }}
          >
            <Field label="Clave" className="grow">
              <input id="track-key" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="bs-…" autoComplete="off" />
            </Field>
            <Button variant="primary" type="submit" disabled={!draft.trim()}>
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );

  const demos = data?.demos ?? [];
  const totals = {
    demos: demos.length,
    opens: demos.reduce((n, d) => n + d.opens, 0),
    hot: demos.filter((d) => heat(d).cls === 'hot' || heat(d).cls === 'warm').length,
    cta: demos.filter((d) => d.cta > 0).length,
  };

  return (
    <div className="track">
      <div className="track-head">
        <div>
          <h2 className="display">Seguimiento de demos</h2>
          <p className="muted">Quién abrió su demo, cuántas veces y qué hizo adentro. Se actualiza cada minuto.</p>
        </div>
        <div className="row gap-sm wrap">
          <Toggle
            checked={owner}
            onChange={(v) => {
              markOwnerBrowser(v);
              setOwner(v);
            }}
            label="No contar mis visitas en este navegador"
          />
          <Button icon="repeat" onClick={load} disabled={state === 'loading'}>
            {state === 'loading' ? 'Actualizando…' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {state === 'error' && <div className="notice">No se pudo cargar el seguimiento. Revisa tu conexión y pulsa Actualizar.</div>}

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Demos abiertos</span>
          <span className="kpi-value tabular">{totals.demos}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Aperturas en total</span>
          <span className="kpi-value tabular">{totals.opens}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Prospectos calientes</span>
          <span className="kpi-value tabular">{totals.hot}</span>
          <span className="kpi-foot">escríbeles hoy</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Tocaron "Quiero activarlo"</span>
          <span className="kpi-value tabular">{totals.cta}</span>
        </div>
      </div>

      {data && demos.length === 0 && (
        <div className="card">
          <div className="card-body muted">Todavía nadie ha abierto un demo. Cuando un prospecto abra su enlace, aparece aquí en menos de un minuto.</div>
        </div>
      )}

      {demos.length > 0 && (
        <div className="table-card">
          <table className="table track-table">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Estado</th>
                <th className="num">Aperturas</th>
                <th>Última vez</th>
                <th className="hide-mobile">Qué hizo</th>
                <th className="hide-mobile">Vendedor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {demos.map((d) => {
                const h = heat(d);
                const link = `${location.pathname}?${d.kind === 'menu' ? 'm' : 'c'}=${d.slug}`;
                return (
                  <tr key={d.key}>
                    <td>
                      <strong>{d.name}</strong>
                      <span className="muted small block">
                        {d.kind === 'menu' ? 'Pedidos por QR' : 'Agenda'} · primera vez {ago(d.first)}
                      </span>
                    </td>
                    <td>
                      <span className={cx('heat', h.cls)} title={h.tip}>
                        {h.label}
                      </span>
                    </td>
                    <td className="num tabular">
                      {d.opens}
                      {d.mobile > 0 && <span className="muted small block">{d.mobile} en celular</span>}
                    </td>
                    <td className="small">{ago(d.last)}</td>
                    <td className="hide-mobile">
                      <span className="track-acts">
                        {d.cta > 0 && <span className="chip on">Activar{d.lastCta ? ` · ${d.lastCta}` : ''}</span>}
                        {d.calc > 0 && <span className="chip">Calculadora</span>}
                        {d.booking > 0 && <span className="chip">{d.booking} reserva(s)</span>}
                        {d.order > 0 && <span className="chip">{d.order} pedido(s)</span>}
                        {!d.cta && !d.calc && !d.booking && !d.order && <span className="muted small">Sólo miró</span>}
                      </span>
                    </td>
                    <td className="hide-mobile small">{d.seller || '—'}</td>
                    <td className="actions">
                      {d.slug && !d.slug.startsWith('sin') && (
                        <a className="icon-btn" href={link} target="_blank" rel="noreferrer" title="Abrir demo (guardado como archivo)">
                          <Icon name="external" size={15} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(data?.recent.length ?? 0) > 0 && (
        <>
          <h3 className="section-title">Actividad reciente</h3>
          <ul className="track-feed">
            {data!.recent.slice(0, 25).map((r, i) => (
              <li key={i}>
                <span className={cx('track-dot', r.event)} />
                <span className="grow">
                  <strong>{r.name}</strong> {EVENT_LABEL[r.event] ?? r.event}
                  {r.detail && <span className="muted"> · {r.detail}</span>}
                  <span className="muted small"> · {r.device === 'm' ? 'celular' : 'computador'}</span>
                </span>
                <span className="muted small">{ago(r.at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
