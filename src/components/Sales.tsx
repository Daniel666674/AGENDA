// Herramientas de venta dentro de cada demo: "Quiero activarlo" y la calculadora "Tu ahorro".
import { useEffect, useMemo, useState } from 'react';
import { PLANS, type Seller } from '../config/sales';
import { track } from '../lib/track';
import { digits } from '../lib/messaging';
import { Button, Modal, cx } from './ui';
import { Icon } from './Icon';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
const money = (n: number) => cop.format(Math.round(n / 1000) * 1000);

type Kind = 'agenda' | 'menu';

function waLink(seller: Seller, business: string, plan: string) {
  const link = location.origin + location.pathname + location.search;
  const text =
    plan === 'hablar'
      ? `Hola ${seller.name} 👋 Soy de ${business}. Vi el demo que nos armaron (${link}) y me gustaría hablar antes de decidir.`
      : `Hola ${seller.name} 👋 Soy de ${business}. Vi el demo (${link}) y quiero activar el plan ${plan}. ¿Qué necesitan de mi parte?`;
  return `https://wa.me/${digits(seller.phone)}?text=${encodeURIComponent(text)}`;
}

// ── "Quiero activarlo" ───────────────────────────────────
let openActivate: () => void = () => {};
export const showActivate = () => openActivate();

export function ActivateCTA({ kind, business, seller }: { kind: Kind; business: string; seller: Seller }) {
  const [open, setOpen] = useState(false);
  openActivate = () => setOpen(true);
  if (!seller.phone) return null;
  return (
    <>
      <button className="activate-fab" onClick={() => setOpen(true)}>
        <Icon name="sparkle" size={16} />
        <span>Quiero activarlo</span>
      </button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title={`Activa ${business}`} width={560}>
          <p className="muted activate-sub">Elige un plan y {seller.name} te escribe por WhatsApp para dejarlo funcionando con tus datos reales en 72 horas.</p>
          <div className="activate-plans">
            {PLANS[kind].map((p) => (
              <a key={p.id} className={cx('activate-plan', p.rec && 'rec')} href={waLink(seller, business, p.id)} target="_blank" rel="noreferrer" onClick={() => track('cta', p.id)}>
                {p.rec && <span className="activate-rec">Recomendado</span>}
                <strong>{p.id}</strong>
                <span className="activate-price">
                  {money(p.price)}
                  <small> /mes</small>
                </span>
                <span className="muted small">{p.note}</span>
              </a>
            ))}
          </div>
          <a className="activate-talk" href={waLink(seller, business, 'hablar')} target="_blank" rel="noreferrer" onClick={() => track('cta', 'hablar')}>
            <Icon name="whatsapp" size={16} /> Primero quiero hablar con {seller.name}
          </a>
          <ul className="activate-facts">
            <li>
              <Icon name="check" size={14} /> Implementación en 72 horas con tus servicios y tu marca
            </li>
            <li>
              <Icon name="check" size={14} /> 60 días de garantía: si no recuperas lo que pagas, el tercer mes no se cobra
            </li>
            <li>
              <Icon name="check" size={14} /> Precios más IVA ·{' '}
              <a href="/precios.html" target="_blank" rel="noreferrer">
                ver todo lo que incluye cada plan
              </a>
            </li>
          </ul>
        </Modal>
      )}
    </>
  );
}

// ── Calculadora "Tu ahorro" ──────────────────────────────
interface FieldDef {
  id: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  unit?: 'money' | '%' | 'h' | 'min' | '';
}

const AGENDA_FIELDS: FieldDef[] = [
  { id: 'citas', label: 'Citas por semana', min: 10, max: 600, step: 5 },
  { id: 'ticket', label: 'Valor promedio de una cita', min: 10000, max: 800000, step: 5000, unit: 'money' },
  { id: 'noshow', label: 'Clientes que no llegan', hint: 'Porcentaje de citas perdidas por inasistencia', min: 0, max: 40, step: 1, unit: '%' },
  { id: 'horas', label: 'Horas al día respondiendo WhatsApp', min: 0, max: 8, step: 0.5, unit: 'h' },
  { id: 'hora', label: 'Costo de una hora de recepción', hint: 'Salario + prestaciones, aproximado', min: 5000, max: 40000, step: 500, unit: 'money' },
];

const MENU_FIELDS: FieldDef[] = [
  { id: 'mesas', label: 'Mesas', min: 2, max: 80, step: 1 },
  { id: 'rotacion', label: 'Veces que se ocupa cada mesa al día', min: 0.5, max: 8, step: 0.5 },
  { id: 'ticket', label: 'Consumo promedio por mesa', min: 10000, max: 500000, step: 5000, unit: 'money' },
  { id: 'dias', label: 'Días abiertos al mes', min: 8, max: 31, step: 1 },
  { id: 'espera', label: 'Minutos esperando al mesero para pedir', min: 0, max: 30, step: 1, unit: 'min' },
];

const PLAN_PRO = { agenda: PLANS.agenda[1].price, menu: PLANS.menu[1].price };

export function SavingsCalc({ kind, business, defaults, seller }: { kind: Kind; business: string; defaults: Record<string, number>; seller: Seller }) {
  const fields = kind === 'agenda' ? AGENDA_FIELDS : MENU_FIELDS;
  const [v, setV] = useState<Record<string, number>>(defaults);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) track('calc');
  }, [touched]);

  const r = useMemo(() => {
    if (kind === 'agenda') {
      const citasMes = v.citas * 4.3;
      const perdido = citasMes * (v.noshow / 100) * v.ticket;
      const rows = [
        { label: 'Inasistencias recuperadas con recordatorios', note: 'Recordatorios 48 h y 2 h: 40% menos citas perdidas', value: perdido * 0.4 },
        { label: 'Citas nuevas por reservas 24/7 y "recordatorio para volver"', note: '+2% de citas al mes', value: citasMes * 0.02 * v.ticket },
        { label: 'Tiempo de WhatsApp que ya no se gasta', note: `${Math.round(v.horas * 0.5 * 26)} horas al mes (la mitad del tiempo actual)`, value: v.horas * 0.5 * 26 * v.hora },
      ];
      return { hoy: perdido, hoyLabel: 'Hoy se pierden por inasistencias', rows };
    }
    const ventas = v.mesas * v.rotacion * v.ticket * v.dias;
    const rows = [
      { label: 'Más rotación en horas pico', note: `El cliente pide al sentarse: ${v.espera} min menos por mesa en la mitad de los servicios`, value: ventas * Math.min(0.06, v.espera * 0.004) * 0.5 },
      { label: 'Ticket más alto con fotos y adiciones', note: '+3% por sugerencias, combos y adiciones en la carta', value: ventas * 0.03 },
      { label: 'Errores de comanda que ya no se pagan', note: 'Medio punto de las ventas se pierde por errores al anotar', value: ventas * 0.005 },
    ];
    return { hoy: ventas, hoyLabel: 'Ventas mensuales estimadas hoy', rows };
  }, [v, kind]);

  const total = r.rows.reduce((n, x) => n + x.value, 0);
  const plan = PLAN_PRO[kind];
  const veces = total / plan;
  const dias = total > 0 ? Math.max(1, Math.ceil((plan / total) * 30)) : 0;

  const fmt = (f: FieldDef, n: number) => (f.unit === 'money' ? money(n) : f.unit === '%' ? `${n}%` : f.unit === 'h' ? `${n} h` : f.unit === 'min' ? `${n} min` : String(n));

  return (
    <div className="page calc-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Tu ahorro</p>
          <h1>¿Cuánto le deja esto a {business}?</h1>
          <p className="muted">Mueve los valores con los números reales del negocio. Los cálculos usan supuestos conservadores.</p>
        </div>
      </div>
      <div className="calc-grid">
        <section className="card calc-inputs">
          <div className="card-body">
            {fields.map((f) => (
              <label key={f.id} className="calc-field" htmlFor={`calc-${f.id}`}>
                <span className="calc-top">
                  <span>
                    <strong>{f.label}</strong>
                    {f.hint && <span className="muted small block">{f.hint}</span>}
                  </span>
                  <b className="tabular">{fmt(f, v[f.id])}</b>
                </span>
                <input
                  id={`calc-${f.id}`}
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={v[f.id]}
                  onChange={(e) => {
                    setV({ ...v, [f.id]: Number(e.target.value) });
                    setTouched(true);
                  }}
                />
              </label>
            ))}
          </div>
        </section>
        <section className="calc-result">
          <div className="calc-hero">
            <span className="eyebrow on-dark">Beneficio estimado al mes</span>
            <span className="calc-total tabular">{money(total)}</span>
            <span className="calc-roi">
              {veces >= 1 ? (
                <>
                  El plan Pro ({money(plan)}/mes) se paga <b>{veces.toFixed(1).replace('.', ',')} veces</b> · se recupera en <b>{dias} días</b>
                </>
              ) : (
                <>Con estos números el plan Esencial es el indicado.</>
              )}
            </span>
          </div>
          <ul className="calc-rows">
            <li className="calc-now">
              <span>
                <strong>{r.hoyLabel}</strong>
              </span>
              <b className="tabular">{money(r.hoy)}</b>
            </li>
            {r.rows.map((x) => (
              <li key={x.label}>
                <span>
                  <strong>{x.label}</strong>
                  <span className="muted small block">{x.note}</span>
                </span>
                <b className="tabular">+{money(x.value)}</b>
              </li>
            ))}
          </ul>
          {seller.phone && (
            <Button variant="primary" size="lg" icon="sparkle" onClick={showActivate} className="calc-cta">
              Quiero recuperar esto
            </Button>
          )}
          <p className="muted small">Estimaciones de referencia, no garantizadas. Los resultados reales dependen del negocio.</p>
        </section>
      </div>
    </div>
  );
}
