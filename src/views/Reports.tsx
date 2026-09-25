import { useMemo, useState } from 'react';
import { useApp } from '../lib/useApp';
import { addDays, dateKey, fromKey, parseLocal } from '../lib/date';
import { uiActions } from '../store/ui';
import { Avatar, Card, PageHead, Segmented } from '../components/ui';

type Range = '7' | '30' | '90';

export function Reports() {
  const { s, t, money, moneyShort, date, weekdaysShort, time, nouns } = useApp();
  const [range, setRange] = useState<Range>('30');
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const n = Number(range);

  const data = useMemo(() => {
    const today = new Date();
    const fromK = dateKey(addDays(today, -(n - 1)));
    const toK = dateKey(today) + 'T23:59';
    const inRange = s.appointments.filter((a) => a.start >= fromK && a.start <= toK);
    const done = inRange.filter((a) => a.status === 'completed');
    const noShow = inRange.filter((a) => a.status === 'no_show').length;
    const settled = inRange.filter((a) => a.status === 'completed' || a.status === 'no_show').length;
    const revenue = done.reduce((x, a) => x + a.price, 0);

    const days = Array.from({ length: n }, (_, i) => {
      const k = dateKey(addDays(today, -(n - 1) + i));
      return { k, v: done.filter((a) => a.start.startsWith(k)).reduce((x, a) => x + a.price, 0), c: done.filter((a) => a.start.startsWith(k)).length };
    });

    const bySvc = new Map<string, { v: number; c: number }>();
    const byStaff = new Map<string, { v: number; c: number }>();
    const bySrc = new Map<string, number>();
    const byClient = new Map<string, { v: number; c: number }>();
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const a of done) {
      const add = (m: Map<string, { v: number; c: number }>, k: string) => {
        const x = m.get(k) ?? { v: 0, c: 0 };
        x.v += a.price;
        x.c++;
        m.set(k, x);
      };
      add(bySvc, a.serviceId);
      add(byStaff, a.staffId);
      add(byClient, a.clientId);
    }
    for (const a of inRange.filter((x) => x.status !== 'cancelled')) {
      bySrc.set(a.source, (bySrc.get(a.source) ?? 0) + 1);
      const d = parseLocal(a.start);
      heat[d.getDay()][d.getHours()]++;
    }
    const total = [...bySrc.values()].reduce((x, y) => x + y, 0);
    return { revenue, done: done.length, avg: done.length ? revenue / done.length : 0, noShowRate: settled ? noShow / settled : 0, days, bySvc, byStaff, bySrc, byClient, heat, total, online: total ? (bySrc.get('online') ?? 0) / total : 0 };
  }, [s, n]);

  const maxDay = Math.max(1, ...data.days.map((d) => d.v));
  const niceMax = niceCeil(maxDay);
  const svcRows = [...data.bySvc.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 8);
  const staffRows = [...data.byStaff.entries()].sort((a, b) => b[1].v - a[1].v);
  const clientRows = [...data.byClient.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 6);
  const maxSvc = Math.max(1, ...svcRows.map((r) => r[1].v));
  const maxStaff = Math.max(1, ...staffRows.map((r) => r[1].v));

  // horas con actividad para la matriz
  const hourIdx: number[] = [];
  for (let h = 0; h < 24; h++) if (data.heat.some((row) => row[h] > 0) || s.business.hours.some((d) => d.open && Number(d.start.slice(0, 2)) <= h && Number(d.end.slice(0, 2)) > h)) hourIdx.push(h);
  const dayOrder = s.business.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const maxHeat = Math.max(1, ...data.heat.flat());
  const labelEvery = n <= 7 ? 1 : n <= 30 ? 5 : 15;

  return (
    <div className="page">
      <PageHead title={t('nav_reports')} sub={t('reports_sub', { n })}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: t('range_7') },
            { value: '30', label: t('range_30') },
            { value: '90', label: t('range_90') },
          ]}
        />
      </PageHead>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">{t('r_revenue')}</span>
          <span className="kpi-value tabular">{moneyShort(data.revenue)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{t('r_appts')}</span>
          <span className="kpi-value tabular">{data.done}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{t('r_avg_ticket')}</span>
          <span className="kpi-value tabular">{money(Math.round(data.avg))}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{t('r_noshow_rate')}</span>
          <span className="kpi-value tabular">{(data.noShowRate * 100).toFixed(1)}%</span>
          <span className="kpi-foot">
            {Math.round(data.online * 100)}% {t('r_online_share')}
          </span>
        </div>
      </div>

      <Card title={t('r_rev_by_day')} className="chart-card">
        <div className="bars-v" onMouseLeave={() => setHoverDay(null)}>
          <div className="bars-grid">
            {[1, 0.5, 0].map((f) => (
              <span key={f} className="grid-line" style={{ bottom: `${f * 100}%` }}>
                <span className="grid-label tabular">{moneyShort(niceMax * f)}</span>
              </span>
            ))}
          </div>
          <div className="bars-plot" style={{ ['--n' as string]: n }}>
            {data.days.map((d, i) => (
              <button key={d.k} className="bar-v-hit" onMouseEnter={() => setHoverDay(i)} onFocus={() => setHoverDay(i)} aria-label={`${d.k}: ${money(d.v)}`}>
                <span className="bar-v" style={{ height: `${(d.v / niceMax) * 100}%` }} data-on={hoverDay === i || undefined} />
                {i % labelEvery === 0 && <span className="bar-x">{n <= 7 ? weekdaysShort[fromKey(d.k).getDay()] : fromKey(d.k).getDate()}</span>}
              </button>
            ))}
            {hoverDay !== null && (
              <div className="chart-tip" style={{ left: `${((hoverDay + 0.5) / n) * 100}%` }}>
                <strong className="tabular">{money(data.days[hoverDay].v)}</strong>
                <span className="muted small">
                  {date(fromKey(data.days[hoverDay].k), { weekday: 'short', day: 'numeric', month: 'short' })} · {t('appts_count', { n: data.days[hoverDay].c })}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid-2 gap-lg">
        <Card title={t('r_by_service')}>
          <div className="hbars">
            {svcRows.map(([id, v]) => {
              const svc = s.services.find((x) => x.id === id);
              return (
                <div key={id} className="hbar" title={`${svc?.name}: ${money(v.v)} · ${v.c}`}>
                  <span className="hbar-label">{svc?.name}</span>
                  <span className="hbar-track">
                    <span className="hbar-fill" style={{ width: `${(v.v / maxSvc) * 100}%`, background: svc?.color }} />
                  </span>
                  <span className="hbar-val tabular">{moneyShort(v.v)}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title={t('r_by_staff')}>
          <div className="hbars">
            {staffRows.map(([id, v]) => {
              const st = s.staff.find((x) => x.id === id);
              return (
                <div key={id} className="hbar" title={`${st?.name}: ${money(v.v)} · ${v.c}`}>
                  <span className="hbar-label row gap-xs">
                    <Avatar name={st?.name ?? ''} color={st?.color} size={20} /> {st?.name}
                  </span>
                  <span className="hbar-track">
                    <span className="hbar-fill" style={{ width: `${(v.v / maxStaff) * 100}%`, background: st?.color }} />
                  </span>
                  <span className="hbar-val tabular">{moneyShort(v.v)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid-2 gap-lg">
        <Card title={t('r_heatmap')}>
          <div className="heat" style={{ ['--h' as string]: hourIdx.length }}>
            <span />
            {hourIdx.map((h) => (
              <span key={h} className="heat-x">
                {h % 2 === 0 ? time(h * 60).replace(':00', '') : ''}
              </span>
            ))}
            {dayOrder.map((d) => (
              <Row key={d} label={weekdaysShort[d]} cells={hourIdx.map((h) => data.heat[d][h])} max={maxHeat} titles={hourIdx.map((h) => `${weekdaysShort[d]} ${time(h * 60)}`)} />
            ))}
          </div>
        </Card>
        <Card title={t('r_by_source')}>
          <div className="hbars">
            {(['online', 'whatsapp', 'staff', 'phone'] as const).map((k) => {
              const v = data.bySrc.get(k) ?? 0;
              const pct = data.total ? v / data.total : 0;
              return (
                <div key={k} className="hbar" title={`${v}`}>
                  <span className="hbar-label">{t(`src_${k}`)}</span>
                  <span className="hbar-track">
                    <span className="hbar-fill accent" style={{ width: `${pct * 100}%` }} />
                  </span>
                  <span className="hbar-val tabular">{Math.round(pct * 100)}%</span>
                </div>
              );
            })}
          </div>
          <h4 className="section-title mt-lg">{t('r_top_clients')}</h4>
          <ul className="rank">
            {clientRows.map(([id, v], i) => {
              const c = s.clients.find((x) => x.id === id);
              return (
                <li key={id}>
                  <button onClick={() => uiActions.openClient(id)}>
                    <span className="rank-n">{i + 1}</span>
                    <Avatar name={c?.name ?? ''} size={26} />
                    <span className="grow">{c?.name}</span>
                    <span className="muted small">
                      {v.c} {t('visits')}
                    </span>
                    <strong className="tabular">{money(v.v)}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
          <span className="sr-only">{nouns.clients}</span>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, cells, max, titles }: { label: string; cells: number[]; max: number; titles: string[] }) {
  return (
    <>
      <span className="heat-y">{label}</span>
      {cells.map((v, i) => (
        <span key={i} className="heat-cell" style={{ ['--v' as string]: v / max }} title={`${titles[i]} · ${v}`} />
      ))}
    </>
  );
}

function niceCeil(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return step * p;
}

