import { useMemo } from 'react';
import { useApp } from '../lib/useApp';
import { lookup } from '../lib/queries';
import { occupancy } from '../lib/availability';
import { addDays, dateKey, minutesOfDay, parseLocal, startOfWeek, toLocal } from '../lib/date';
import { remind, setStatus } from '../store/actions';
import { uiActions } from '../store/ui';
import { go } from '../lib/router';
import { Avatar, Button, Card, Empty, StatusPill, cx } from '../components/ui';
import { Icon } from '../components/Icon';
import { useKeepFresh } from '../components/AppointmentEditor';

export function Dashboard() {
  useKeepFresh();
  const { s, t, money, moneyShort, time, timeOf, longDate, shortDate, status, weekdaysShort, preset, nouns } = useApp();
  const L = lookup(s);
  const now = new Date();
  const todayKey = dateKey(now);
  const nowMin = minutesOfDay(now);
  const today = (L.byDay.get(todayKey) ?? []).filter((a) => a.status !== 'cancelled');

  const greeting = nowMin < 720 ? t('good_morning') : nowMin < 1140 ? t('good_afternoon') : t('good_evening');
  const who = s.business.preparedFor?.replace(/^(Dra?\.|Dr\.)\s*/i, (m) => m) ?? '';

  const kpis = useMemo(() => {
    const rev = today.filter((a) => a.status !== 'no_show').reduce((n, a) => n + a.price, 0);
    const occ = occupancy(s, todayKey);
    const ws = startOfWeek(now, s.business.weekStartsOn);
    const sumWeek = (start: Date) => {
      let n = 0;
      for (let i = 0; i < 7; i++) for (const a of L.byDay.get(dateKey(addDays(start, i))) ?? []) if (a.status !== 'cancelled' && a.status !== 'no_show') n += a.price;
      return n;
    };
    const thisWeek = sumWeek(ws);
    const lastWeek = sumWeek(addDays(ws, -7));
    const monthStart = todayKey.slice(0, 8) + '01';
    const firstSeen = new Map<string, string>();
    for (const a of [...s.appointments].sort((x, y) => x.start.localeCompare(y.start))) if (!firstSeen.has(a.clientId)) firstSeen.set(a.clientId, a.start);
    const newClients = s.clients.filter((c) => (c.createdAt >= monthStart && c.createdAt <= todayKey + 'T23:59') || ((firstSeen.get(c.id) ?? '') >= monthStart && (firstSeen.get(c.id) ?? '') <= todayKey + 'T23:59')).length;
    return { rev, occ, thisWeek, delta: lastWeek ? (thisWeek - lastWeek) / lastWeek : 0, newClients };
  }, [s, todayKey]);

  const next = today.find((a) => minutesOfDay(parseLocal(a.start)) + a.duration > nowMin && (a.status === 'confirmed' || a.status === 'pending' || a.status === 'arrived'));
  const nextIn = next ? minutesOfDay(parseLocal(next.start)) - nowMin : 0;

  const toConfirm = useMemo(() => {
    const out = [];
    for (let i = 0; i <= 2; i++) for (const a of L.byDay.get(dateKey(addDays(now, i))) ?? []) if (a.status === 'pending' && a.start >= toLocal(now)) out.push(a);
    return out.slice(0, 8);
  }, [s]);

  const week = useMemo(() => {
    const ws = startOfWeek(now, s.business.weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      const k = dateKey(d);
      return { d, k, occ: occupancy(s, k), count: (L.byDay.get(k) ?? []).filter((a) => a.status !== 'cancelled').length, open: s.business.hours[d.getDay()]?.open };
    });
  }, [s]);

  const cl = (id: string) => L.client.get(id);
  const sv = (id: string) => L.service.get(id);

  return (
    <div className="page dash">
      <header className="dash-hero">
        <div>
          <p className="eyebrow">{longDate(now)}</p>
          <h1 className="display">
            {greeting}
            {who ? `, ${who}` : ''}
          </h1>
          <p className="muted">
            {today.length === 1 ? t('appt_one') : t('appts_count', { n: today.length })} · {money(kpis.rev)}
          </p>
        </div>
        <div className="page-actions">
          <Button icon="calendar" onClick={() => go('calendar')}>
            {t('see_calendar')}
          </Button>
          <Button variant="primary" icon="plus" onClick={() => uiActions.newAppointment()}>
            {t('new_appt')}
          </Button>
        </div>
      </header>

      <div className="kpis">
        <Kpi label={t('kpi_today')} value={String(today.length)} foot={`${today.filter((a) => a.status === 'completed').length} ${t('st_completed').toLowerCase()}`} />
        <Kpi label={t('kpi_revenue')} value={moneyShort(kpis.rev)} foot={`${today.filter((a) => a.paid).length} ${t('f_paid').toLowerCase()}`} />
        <Kpi label={t('kpi_occupancy')} value={`${Math.round(kpis.occ * 100)}%`} foot={t('of_capacity')} meter={kpis.occ} />
        <Kpi
          label={t('kpi_week_revenue')}
          value={moneyShort(kpis.thisWeek)}
          foot={
            <span className={kpis.delta >= 0 ? 'up' : 'down'}>
              {kpis.delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(kpis.delta * 100))}% {t('vs_last_week')}
            </span>
          }
        />
      </div>

      <div className="dash-grid">
        <div className="col gap-lg">
          {next ? (
            <section className="next-card" style={{ ['--item' as string]: sv(next.serviceId)?.color }}>
              <div className="next-meta">
                <span className="eyebrow on-dark">{next.status === 'arrived' || nextIn <= 0 ? t('now_label') : t('next_up')}</span>
                <span className="next-count">{nextIn > 0 ? (nextIn < 60 ? t('in_minutes', { n: nextIn }) : t('in_hours', { h: Math.floor(nextIn / 60), m: nextIn % 60 })) : timeOf(next.start)}</span>
              </div>
              <div className="next-main">
                <Avatar name={cl(next.clientId)?.name ?? '?'} size={52} />
                <div className="grow">
                  <h2 className="display">{cl(next.clientId)?.name}</h2>
                  <p>
                    {sv(next.serviceId)?.name}
                    {next.petId && ` · ${cl(next.clientId)?.pets.find((p) => p.id === next.petId)?.name}`} · {timeOf(next.start)} ·{' '}
                    {L.staff.get(next.staffId)?.name}
                  </p>
                  {cl(next.clientId)?.notes && <p className="next-note">“{cl(next.clientId)?.notes}”</p>}
                </div>
              </div>
              <div className="next-actions">
                {next.status !== 'arrived' ? (
                  <Button variant="primary" icon="user" onClick={() => setStatus(next.id, 'arrived')}>
                    {t('act_arrived')}
                  </Button>
                ) : (
                  <Button variant="primary" icon="star" onClick={() => setStatus(next.id, 'completed')}>
                    {t('act_complete')}
                  </Button>
                )}
                <Button icon="whatsapp" onClick={() => remind(next)}>
                  WhatsApp
                </Button>
                <Button variant="ghost" icon="right" onClick={() => uiActions.openAppointment(next.id)}>
                  {t('act_edit')}
                </Button>
              </div>
            </section>
          ) : (
            <Card>
              <Empty icon="sparkle" title={t('no_more_today')} />
            </Card>
          )}

          <Card title={t('today_schedule')} action={<span className="muted small">{today.length}</span>} pad={false}>
            {today.length === 0 && <Empty icon="calendar" title={t('empty_day')} />}
            <ol className="timeline">
              {today.map((a) => {
                const st = minutesOfDay(parseLocal(a.start));
                const past = st + a.duration <= nowMin;
                const live = st <= nowMin && !past;
                const c = cl(a.clientId);
                const pet = c?.pets.find((p) => p.id === a.petId);
                const staff = L.staff.get(a.staffId);
                return (
                  <li key={a.id} className={cx('tl-item', past && 'past', live && 'live', `st-${a.status}`)} style={{ ['--item' as string]: sv(a.serviceId)?.color }}>
                    <button className="tl-time" onClick={() => uiActions.openAppointment(a.id)}>
                      <strong>{time(st)}</strong>
                      <span>{time(st + a.duration)}</span>
                    </button>
                    <span className="tl-rail" />
                    <button className="tl-body" onClick={() => uiActions.openAppointment(a.id)}>
                      <span className="tl-title">
                        {c?.name}
                        {pet && (
                          <span className="pet-chip">
                            <Icon name="paw" size={12} /> {pet.name}
                          </span>
                        )}
                      </span>
                      <span className="muted small">
                        {sv(a.serviceId)?.name} · {staff?.name}
                      </span>
                    </button>
                    <div className="tl-side">
                      <StatusPill status={a.status} label={status(a.status)} />
                      <span className="tl-quick">
                        {a.status === 'confirmed' || a.status === 'pending' ? (
                          <button className="icon-btn" title={t('act_arrived')} onClick={() => setStatus(a.id, 'arrived')}>
                            <Icon name="user" size={15} />
                          </button>
                        ) : a.status === 'arrived' ? (
                          <button className="icon-btn" title={t('act_complete')} onClick={() => setStatus(a.id, 'completed')}>
                            <Icon name="check" size={15} />
                          </button>
                        ) : null}
                        {a.status !== 'completed' && (
                          <button className="icon-btn wa" title="WhatsApp" onClick={() => remind(a)}>
                            <Icon name="whatsapp" size={15} />
                          </button>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="col gap-lg">
          <Card title={t('week_load')}>
            <div className="week-bars">
              {week.map((w) => (
                <button key={w.k} className={cx('week-bar', w.k === todayKey && 'today', !w.open && 'closed')} onClick={() => go('calendar', { d: w.k, v: 'day' })}>
                  <span className="wb-track">
                    <span className="wb-fill" style={{ height: `${Math.max(w.open ? 4 : 0, w.occ * 100)}%` }} />
                  </span>
                  <span className="wb-pct tabular">{w.open ? `${Math.round(w.occ * 100)}%` : '—'}</span>
                  <span className="wb-day">{weekdaysShort[w.d.getDay()]}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card
            title={t('to_confirm')}
            action={
              toConfirm.length > 0 && (
                <span className="count-badge" title={t('to_confirm_hint')}>
                  {toConfirm.length}
                </span>
              )
            }
            pad={false}
          >
            {toConfirm.length === 0 ? (
              <Empty icon="check" title={t('all_confirmed')} />
            ) : (
              <ul className="mini-list">
                {toConfirm.map((a) => (
                  <li key={a.id}>
                    <button className="mini-main" onClick={() => uiActions.openAppointment(a.id)}>
                      <Avatar name={cl(a.clientId)?.name ?? '?'} size={30} />
                      <span className="grow">
                        <strong>{cl(a.clientId)?.name}</strong>
                        <span className="muted small block">
                          {shortDate(parseLocal(a.start))} · {timeOf(a.start)} · {sv(a.serviceId)?.name}
                        </span>
                      </span>
                    </button>
                    <button className={cx('icon-btn wa', a.reminded && 'done')} title={t('act_remind')} onClick={() => remind(a)}>
                      <Icon name="whatsapp" size={15} />
                    </button>
                    <button className="icon-btn" title={t('act_confirm')} onClick={() => setStatus(a.id, 'confirmed')}>
                      <Icon name="check" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('waitlist')} action={<Icon name="wait" size={16} className="muted" />} pad={false}>
            {s.waitlist.length === 0 ? (
              <Empty icon="wait" title={t('waitlist_empty')} />
            ) : (
              <ul className="mini-list">
                {s.waitlist.map((w) => (
                  <li key={w.id}>
                    <button className="mini-main" onClick={() => uiActions.newAppointment({ clientId: w.clientId, serviceId: w.serviceId, staffId: w.staffId, start: w.date + 'T09:00' })}>
                      <Avatar name={cl(w.clientId)?.name ?? '?'} size={30} />
                      <span className="grow">
                        <strong>{cl(w.clientId)?.name}</strong>
                        <span className="muted small block">
                          {sv(w.serviceId)?.name} · {shortDate(parseLocal(w.date + 'T12:00'))}
                        </span>
                        <span className="small block wl-note">{w.notes}</span>
                      </span>
                    </button>
                    <button className="icon-btn" title={t('new_appt')} onClick={() => uiActions.newAppointment({ clientId: w.clientId, serviceId: w.serviceId, staffId: w.staffId, start: w.date + 'T09:00' })}>
                      <Icon name="plus" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`${preset.emoji} ${nouns.Clients}`}>
            <div className="kpi-mini">
              <span className="stat-num">{kpis.newClients}</span>
              <span className="muted small">{t('kpi_new_clients')}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, foot, meter }: { label: string; value: string; foot?: React.ReactNode; meter?: number }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value tabular">{value}</span>
      {meter !== undefined && (
        <span className="kpi-meter">
          <span style={{ width: `${Math.round(meter * 100)}%` }} />
        </span>
      )}
      {foot && <span className="kpi-foot">{foot}</span>}
    </div>
  );
}
