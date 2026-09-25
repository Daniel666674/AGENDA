// Automatizaciones: se muestran con datos reales del demo para "vender" el valor antes de tener backend.
import { useMemo, useState } from 'react';
import type { AppState } from '../types';
import { useApp } from '../lib/useApp';
import { AUTOMATIONS, CARE, PREP, REBOOK_DAYS, STAGES, type Automation, type Impact } from '../config/automations';
import { pick } from '../config/presets';
import { lookup, clientStats } from '../lib/queries';
import { occupancy } from '../lib/availability';
import { addDays, dateKey, diffDays, parseLocal, toLocal } from '../lib/date';
import { mutate } from '../store/actions';
import { Avatar, Button, Toggle, cx } from '../components/ui';
import { Icon } from '../components/Icon';

export function isOn(s: AppState, a: Automation): boolean {
  return s.automations?.[a.id] ?? a.defaultOn;
}

interface Estimate {
  money: number;
  count: number;
}

function estimates(s: AppState): Record<Impact, Estimate> {
  const now = new Date();
  const from = dateKey(addDays(now, -30));
  const to = toLocal(now);
  const recent = s.appointments.filter((a) => a.start >= from && a.start <= to);
  const done = recent.filter((a) => a.status === 'completed');
  const avg = done.length ? done.reduce((n, a) => n + a.price, 0) / done.length : 0;
  const noShows = recent.filter((a) => a.status === 'no_show').length;
  const cancelled = recent.filter((a) => a.status === 'cancelled').length;
  const uniq = new Set(done.map((a) => a.clientId)).size;
  const interval = REBOOK_DAYS[s.business.type] ?? 30;
  let slowDays = 0;
  for (let i = 1; i <= 30; i++) {
    const d = addDays(now, i);
    if (s.business.hours[d.getDay()]?.open && occupancy(s, dateKey(d)) < 0.5) slowDays++;
  }
  const L = lookup(s);
  const inactive = s.clients.filter((c) => !(L.byClient.get(c.id) ?? []).some((a) => a.start >= dateKey(addDays(now, -60)))).length;
  const loyal = s.clients.filter((c) => clientStats(s, c.id).visits >= 6).length;
  return {
    noshow: { money: noShows * avg * 0.5, count: Math.round(noShows * 0.5) },
    waitlist: { money: cancelled * avg * 0.35, count: Math.round(cancelled * 0.35) },
    rebook: { money: uniq * Math.min(1, 30 / interval) * 0.25 * avg, count: Math.round(uniq * Math.min(1, 30 / interval) * 0.25) },
    winback: { money: Math.max(inactive, Math.round(s.clients.length * 0.15)) * 0.12 * avg, count: Math.round(Math.max(inactive, s.clients.length * 0.15) * 0.12) },
    slow: { money: slowDays * 2 * avg * 0.5, count: slowDays },
    reviews: { money: 0, count: Math.round(done.length * 0.05) },
    hours: { money: 0, count: Math.round((recent.length * 1.5) / 60) },
    loyalty: { money: 0, count: loyal },
    none: { money: 0, count: 0 },
  };
}

export function Automations() {
  const { s, lang, money, timeOf, longDate, shortDate, t } = useApp();
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const [selected, setSelected] = useState<string>('remind');
  const est = useMemo(() => estimates(s), [s.appointments, s.clients, s.business]);
  const list = AUTOMATIONS.filter((a) => !a.only || a.only.includes(s.business.type));
  const active = list.filter((a) => isOn(s, a));
  const monthly = active.reduce((n, a) => n + est[a.impact].money, 0);
  const lookupS = lookup(s);
  const messages = active.filter((a) => !a.internal).length * Math.max(20, Math.round(s.appointments.length / 3));

  const setOn = (id: string, on: boolean) =>
    mutate(L('Automatización', 'Automation'), (d) => {
      d.automations = { ...(d.automations ?? {}), [id]: on };
    });

  // Datos de muestra reales para rellenar los mensajes
  const sample = useMemo(() => {
    const now = toLocal(new Date());
    const next = s.appointments.filter((a) => a.start > now && (a.status === 'confirmed' || a.status === 'pending')).sort((a, b) => a.start.localeCompare(b.start))[0] ?? s.appointments[0];
    const c = lookupS.client.get(next.clientId);
    const pet = c?.pets.find((p) => p.id === next.petId);
    const svc = lookupS.service.get(next.serviceId);
    const today = (lookupS.byDay.get(dateKey(new Date())) ?? []).filter((a) => a.status !== 'cancelled');
    return {
      cliente: (c?.name.split(' ')[0] ?? '') + (pet ? ` (${pet.name})` : ''),
      servicio: svc?.name ?? '',
      profesional: lookupS.staff.get(next.staffId)?.name ?? '',
      fecha: longDate(parseLocal(next.start)),
      hora: timeOf(next.start),
      negocio: s.business.name,
      direccion: s.business.address || s.business.name,
      link: `agenda.link/${s.slug}`,
      intervalo: `${REBOOK_DAYS[s.business.type]} ${t('days')}`,
      preparacion: pick(PREP[s.business.type], lang),
      cuidados: pick(CARE[s.business.type], lang),
      anticipo: money(Math.round((svc?.price ?? 0) * 0.3)),
      citas: String(today.length),
      ingreso: money(today.reduce((n, a) => n + a.price, 0)),
      visitas: String(c ? clientStats(s, c.id).visits : 6),
    };
  }, [s, lang]);

  const fill = (tpl: string) => tpl.replace(/\{(\w+)\}/g, (_, k) => (sample as Record<string, string>)[k] ?? `{${k}}`);
  const sel = list.find((a) => a.id === selected) ?? list[0];

  // Próximos envíos (simulados a partir de la agenda real)
  const queue = useMemo(() => {
    const out: { key: string; when: string; auto: Automation; who: string; detail: string }[] = [];
    const now = new Date();
    const nowK = toLocal(now);
    const byId = Object.fromEntries(list.map((a) => [a.id, a]));
    if (isOn(s, byId.remind))
      s.appointments
        .filter((a) => a.start > nowK && a.start < toLocal(addDays(now, 2)) && !a.reminded && a.status !== 'cancelled')
        .slice(0, 3)
        .forEach((a) =>
          out.push({ key: 'r' + a.id, when: `${shortDate(parseLocal(a.start))} · ${timeOf(a.start)}`, auto: byId.remind, who: lookupS.client.get(a.clientId)?.name ?? '', detail: lookupS.service.get(a.serviceId)?.name ?? '' }),
        );
    if (isOn(s, byId.review))
      s.appointments
        .filter((a) => a.status === 'completed' && a.start.startsWith(dateKey(addDays(now, -1))))
        .slice(0, 2)
        .forEach((a) => out.push({ key: 'v' + a.id, when: L('Hoy', 'Today'), auto: byId.review, who: lookupS.client.get(a.clientId)?.name ?? '', detail: lookupS.service.get(a.serviceId)?.name ?? '' }));
    if (isOn(s, byId.rebook)) {
      const interval = Math.min(REBOOK_DAYS[s.business.type], 35);
      let n = 0;
      for (const c of s.clients) {
        if (n >= 2) break;
        const st = clientStats(s, c.id);
        if (!st.next && st.last && diffDays(now, parseLocal(st.last.start)) >= interval) {
          out.push({ key: 'b' + c.id, when: L('Mañana 10:00', 'Tomorrow 10:00'), auto: byId.rebook, who: c.name, detail: lookupS.service.get(st.last.serviceId)?.name ?? '' });
          n++;
        }
      }
    }
    if (isOn(s, byId.waitlist))
      s.waitlist.slice(0, 1).forEach((w) => out.push({ key: 'w' + w.id, when: L('Al liberarse un espacio', 'When a slot opens'), auto: byId.waitlist, who: lookupS.client.get(w.clientId)?.name ?? '', detail: lookupS.service.get(w.serviceId)?.name ?? '' }));
    return out;
  }, [s, lang]);

  const impactLabel = (a: Automation) => {
    const e = est[a.impact];
    switch (a.impact) {
      case 'reviews':
        return L(`+${e.count} reseñas al mes`, `+${e.count} reviews / month`);
      case 'hours':
        return L(`≈ ${Math.max(2, e.count)} h ahorradas al mes`, `≈ ${Math.max(2, e.count)} h saved / month`);
      case 'loyalty':
        return L(`${e.count} clientes califican hoy`, `${e.count} clients qualify today`);
      case 'none':
        return L('Mejor experiencia', 'Better experience');
      default:
        return L(`≈ ${money(Math.round(e.money))} al mes`, `≈ ${money(Math.round(e.money))} / month`);
    }
  };

  return (
    <div className="page auto-page">
      <header className="dash-hero">
        <div>
          <p className="eyebrow">{t('nav_automations')}</p>
          <h1 className="display">{L('Tu negocio, trabajando solo.', 'Your business, on autopilot.')}</h1>
          <p className="muted lead">
            {L(
              'Mensajes que salen solos por WhatsApp en el momento justo: recuerdan, confirman, llenan huecos y traen clientes de vuelta. Tú sólo atiendes.',
              'WhatsApp messages that go out on their own at the right moment: they remind, confirm, fill gaps and bring clients back. You just do the work.',
            )}
          </p>
        </div>
        <div className="page-actions">
          <Button icon="check" onClick={() => mutate(L('Activar todas', 'Enable all'), (d) => (d.automations = Object.fromEntries(list.map((a) => [a.id, true]))))}>
            {L('Activar todas', 'Enable all')}
          </Button>
        </div>
      </header>

      <section className="auto-impact">
        <div className="auto-impact-main">
          <span className="eyebrow on-dark">{L('Con lo que tienes activo, cada mes recuperas aprox.', 'With what’s active, each month you recover approx.')}</span>
          <span className="auto-impact-num tabular">{money(Math.round(monthly))}</span>
          <span className="auto-impact-foot">{L('Estimado con tus citas, cancelaciones e inasistencias de los últimos 30 días.', 'Estimated from your last 30 days of bookings, cancellations and no-shows.')}</span>
        </div>
        <div className="auto-impact-stats">
          <div>
            <span className="stat-num">
              {active.length}/{list.length}
            </span>
            <span className="small">{L('activas', 'active')}</span>
          </div>
          <div>
            <span className="stat-num">{messages.toLocaleString()}</span>
            <span className="small">{L('mensajes al mes', 'messages / month')}</span>
          </div>
          <div>
            <span className="stat-num">{Math.max(4, est.hours.count * 2)} h</span>
            <span className="small">{L('de recepción ahorradas', 'front-desk hours saved')}</span>
          </div>
        </div>
      </section>

      <div className="auto-grid">
        <div className="col gap-lg">
          {STAGES.map((stage) => {
            const items = list.filter((a) => a.stage === stage.id);
            if (!items.length) return null;
            return (
              <section key={stage.id}>
                <div className="auto-stage-head">
                  <h3 className="display">{pick(stage.title, lang)}</h3>
                  <span className="muted small">{pick(stage.sub, lang)}</span>
                </div>
                <div className="auto-list">
                  {items.map((a) => {
                    const on = isOn(s, a);
                    return (
                      <article key={a.id} className={cx('auto-card', on && 'on', selected === a.id && 'sel')} onClick={() => setSelected(a.id)}>
                        <span className="auto-icon">
                          <Icon name={a.icon} size={18} />
                        </span>
                        <div className="grow">
                          <div className="row gap-sm wrap">
                            <strong>{pick(a.title, lang)}</strong>
                            {a.internal && <span className="tag">{L('Para ti', 'For you')}</span>}
                          </div>
                          <p className="muted small">{pick(a.desc, lang)}</p>
                          <div className="auto-meta">
                            <span>
                              <Icon name="clock" size={12} /> {fill(pick(a.trigger, lang).replace('{intervalo}', sample.intervalo))}
                            </span>
                            <span className={cx('auto-value', on && a.impact !== 'none' && 'strong')}>{impactLabel(a)}</span>
                          </div>
                        </div>
                        <span onClick={(e) => e.stopPropagation()}>
                          <Toggle checked={on} onChange={(v) => setOn(a.id, v)} />
                        </span>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="auto-side">
          <div className="wa-card">
            <header className="wa-head">
              {sel.internal ? (
                <span className="avatar" style={{ width: 36, height: 36, ['--item' as string]: 'var(--accent)' }}>
                  <Icon name="bell" size={16} />
                </span>
              ) : (
                <Avatar name={sample.cliente.replace(/\s*\(.*\)/, '')} size={36} />
              )}
              <div className="grow">
                <strong>{sel.internal ? L('Tú (dueño/a)', 'You (owner)') : sample.cliente}</strong>
                <span className="small">{sel.internal ? s.business.name : 'WhatsApp'}</span>
              </div>
              <Icon name="whatsapp" size={20} />
            </header>
            <div className="wa-body">
              <span className="wa-day">{L('Hoy', 'Today')}</span>
              <div className="wa-bubble">
                <span className="wa-from">{s.business.name}</span>
                {fill(pick(sel.message, lang))}
                <span className="wa-time">
                  9:41 <Icon name="check" size={12} strokeWidth={2.4} />
                </span>
              </div>
              {sel.id === 'remind' && <div className="wa-bubble wa-in">1 👍</div>}
              {sel.id === 'remind' && (
                <div className="wa-bubble wa-system">
                  <Icon name="check" size={12} /> {L('Cita marcada como Confirmada automáticamente', 'Appointment auto-marked as Confirmed')}
                </div>
              )}
              {sel.id === 'review' && <div className="wa-bubble wa-in">5 ⭐⭐⭐⭐⭐</div>}
              {sel.id === 'review' && (
                <div className="wa-bubble">
                  <span className="wa-from">{s.business.name}</span>
                  {L('¡Gracias! 🙌 ¿Nos ayudas con una reseña en Google? Tarda 20 segundos: g.page/r/', 'Thank you! 🙌 Could you leave us a Google review? Takes 20 seconds: g.page/r/')}
                  {s.slug}
                  <span className="wa-time">9:44</span>
                </div>
              )}
              {sel.id === 'waitlist' && <div className="wa-bubble wa-in">{L('¡SÍ! 🙋‍♀️', 'YES! 🙋‍♀️')}</div>}
            </div>
            <footer className="wa-foot">
              <span className="muted small">
                <Icon name="sparkle" size={12} /> {L('Vista previa con datos reales de tu agenda', 'Preview using real data from your calendar')}
              </span>
            </footer>
          </div>

          <div className="card">
            <header className="card-head">
              <h3>{L('Próximos envíos', 'Up next')}</h3>
              <span className="muted small">{queue.length}</span>
            </header>
            <ul className="mini-list">
              {queue.length === 0 && <li className="muted small" style={{ padding: 12 }}>{L('Activa una automatización para ver su cola.', 'Enable an automation to see its queue.')}</li>}
              {queue.map((q) => (
                <li key={q.key}>
                  <button className="mini-main" onClick={() => setSelected(q.auto.id)}>
                    <span className="auto-icon sm">
                      <Icon name={q.auto.icon} size={14} />
                    </span>
                    <span className="grow">
                      <strong>{q.who}</strong>
                      <span className="muted small block">
                        {pick(q.auto.title, lang)} · {q.detail}
                      </span>
                    </span>
                    <span className="muted small">{q.when}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
