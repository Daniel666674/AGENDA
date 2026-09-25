import { useEffect, useMemo, useRef, useState } from 'react';
import type { Appointment, AppState } from '../types';
import { useApp } from '../lib/useApp';
import { lookup } from '../lib/queries';
import { go, useRoute } from '../lib/router';
import { layoutLanes, occupancy, workingWindows, type Interval } from '../lib/availability';
import { addDays, addMonths, atMinutes, dateKey, fromKey, isToday, minutesOfDay, monthMatrix, parseLocal, startOfWeek, toMin } from '../lib/date';
import { moveAppointment, resizeAppointment } from '../store/actions';
import { uiActions, useUI } from '../store/ui';
import { Avatar, Button, Segmented, StatusPill, cx } from '../components/ui';
import { Icon } from '../components/Icon';
import { useKeepFresh } from '../components/AppointmentEditor';

type View = 'day' | 'week' | 'month' | 'list';
const HOUR = 76;
const PPM = HOUR / 60;
const SNAP = 15;

function readHidden(slug: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`agenda-hidden:${slug}`) ?? '[]');
  } catch {
    return [];
  }
}

export function CalendarView() {
  useKeepFresh();
  const { s, t, date, longDate } = useApp();
  const { params } = useRoute();
  const view = (params.get('v') as View) || (window.innerWidth < 720 ? 'day' : 'day');
  const cursor = params.get('d') ? fromKey(params.get('d')!) : new Date();
  const [hidden, setHidden] = useState<string[]>(() => readHidden(s.slug));
  useEffect(() => {
    try {
      localStorage.setItem(`agenda-hidden:${s.slug}`, JSON.stringify(hidden));
    } catch {
      /* sin almacenamiento */
    }
  }, [hidden, s.slug]);

  const [focus, setFocus] = useState<string | null>(null);
  const active = s.staff.filter((x) => x.active);
  const staff = active.filter((x) => !hidden.includes(x.id));
  // En semana, con más de 2 profesionales se muestra uno a la vez (legible)
  const single = view === 'week' && active.length > 2;
  const focused = active.find((x) => x.id === focus) ?? staff[0] ?? active[0];
  const weekStaff = single ? [focused] : staff;
  const nav = (d: Date, v: View = view) => go('calendar', { d: dateKey(d), v });
  const step = (dir: number) => nav(view === 'month' ? addMonths(cursor, dir) : view === 'week' ? addDays(cursor, dir * 7) : view === 'list' ? addDays(cursor, dir * 14) : addDays(cursor, dir));

  // atajos de teclado
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.overlay')) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft') step(-1);
      else if (k === 'arrowright') step(1);
      else if (k === 't') nav(new Date());
      else if (k === 'd') nav(cursor, 'day');
      else if (k === 'w') nav(cursor, 'week');
      else if (k === 'm') nav(cursor, 'month');
      else if (k === 'l') nav(cursor, 'list');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const ws = startOfWeek(cursor, s.business.weekStartsOn);
  const title =
    view === 'day'
      ? longDate(cursor)
      : view === 'week'
        ? `${date(ws, { day: 'numeric', month: 'short' })} – ${date(addDays(ws, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
        : view === 'month'
          ? date(cursor, { month: 'long', year: 'numeric' })
          : `${date(cursor, { day: 'numeric', month: 'short' })} – ${date(addDays(cursor, 13), { day: 'numeric', month: 'short' })}`;

  return (
    <div className="page cal-page">
      <div className="cal-toolbar">
        <div className="row gap-sm">
          <Button onClick={() => nav(new Date())}>{t('today_btn')}</Button>
          <div className="btn-group">
            <Button variant="ghost" icon="left" onClick={() => step(-1)} aria-label="prev" />
            <Button variant="ghost" icon="right" onClick={() => step(1)} aria-label="next" />
          </div>
          <h1 className="cal-title display">{title}</h1>
          {view === 'day' && isToday(cursor) && <span className="today-dot" />}
        </div>
        <div className="row gap-sm wrap">
          <div className="staff-filter">
            {active.map((x) => (
                <button
                  key={x.id}
                  className={cx('staff-toggle', (single ? x.id !== focused.id : hidden.includes(x.id)) && 'off')}
                  title={x.name}
                  onClick={() =>
                    single ? setFocus(x.id) : setHidden((h) => (h.includes(x.id) ? h.filter((y) => y !== x.id) : active.length - h.length > 1 ? [...h, x.id] : h))
                  }
                >
                  <Avatar name={x.name} color={x.color} photo={x.photo} size={30} ring />
                </button>
              ))}
          </div>
          <Segmented
            value={view}
            onChange={(v) => nav(cursor, v)}
            options={[
              { value: 'day', label: t('view_day') },
              { value: 'week', label: t('view_week') },
              { value: 'month', label: t('view_month') },
              { value: 'list', label: t('view_list') },
            ]}
          />
          <Button variant="ghost" icon="printer" onClick={() => window.print()} aria-label={t('print_day')} className="hide-mobile" />
        </div>
      </div>

      {view === 'day' && (
        <TimeGrid
          columns={staff.map((st) => ({ key: st.id, day: dateKey(cursor), staffIds: [st.id], dropStaff: st.id }))}
          header={(c) => {
            const st = s.staff.find((x) => x.id === c.dropStaff)!;
            const count = (lookup(s).byDay.get(c.day) ?? []).filter((a) => a.staffId === st.id && a.status !== 'cancelled').length;
            return (
              <div className="col-head staff-head">
                <Avatar name={st.name} color={st.color} photo={st.photo} size={34} ring />
                <div>
                  <strong>{st.name}</strong>
                  <span className="muted small">{count === 1 ? t('appt_one') : t('appts_count', { n: count })}</span>
                </div>
              </div>
            );
          }}
        />
      )}
      {single && (
        <div className="week-focus">
          <Avatar name={focused.name} color={focused.color} photo={focused.photo} size={26} />
          <strong>{focused.name}</strong>
          <span className="muted small">{focused.role}</span>
        </div>
      )}
      {view === 'week' && (
        <TimeGrid
          colorByStaff={weekStaff.length > 1}
          columns={Array.from({ length: 7 }, (_, i) => addDays(ws, i))
            .filter((d) => s.business.hours[d.getDay()]?.open || (lookup(s).byDay.get(dateKey(d)) ?? []).length > 0)
            .map((d) => ({ key: dateKey(d), day: dateKey(d), staffIds: weekStaff.map((x) => x.id), dropStaff: single ? focused.id : undefined }))}
          header={(c) => {
            const d = fromKey(c.day);
            const occ = occupancy(s, c.day);
            return (
              <button className={cx('col-head day-head', isToday(d) && 'is-today')} onClick={() => nav(d, 'day')}>
                <span className="dh-wd">{date(d, { weekday: 'short' }).replace('.', '')}</span>
                <span className="dh-num">{d.getDate()}</span>
                <span className="dh-occ" title={`${Math.round(occ * 100)}%`}>
                  <span style={{ width: `${occ * 100}%` }} />
                </span>
              </button>
            );
          }}
        />
      )}
      {view === 'month' && <MonthView cursor={cursor} staffIds={staff.map((x) => x.id)} onDay={(d) => nav(d, 'day')} />}
      {view === 'list' && <ListView from={cursor} staffIds={staff.map((x) => x.id)} />}
      {(view === 'day' || view === 'week') && <p className="muted small cal-hint hide-mobile">{t('drag_hint')}</p>}
    </div>
  );
}

// ── Rejilla de tiempo (día / semana) ─────────────────────────────
interface Column {
  key: string;
  day: string;
  staffIds: string[];
  dropStaff?: string;
}

interface DragState {
  id: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  grabOffset: number;
  moved: boolean;
  col: number;
  minute: number;
  duration: number;
}

function hoursRange(s: AppState, columns: Column[]): [number, number] {
  let min = 24 * 60;
  let max = 0;
  const days = [...new Set(columns.map((c) => c.day))];
  for (const k of days) {
    const h = s.business.hours[fromKey(k).getDay()];
    if (h?.open) {
      min = Math.min(min, toMin(h.start));
      max = Math.max(max, toMin(h.end));
    }
    for (const a of lookup(s).byDay.get(k) ?? []) {
      const st = minutesOfDay(parseLocal(a.start));
      min = Math.min(min, st);
      max = Math.max(max, st + a.duration);
    }
  }
  if (min >= max) return [9 * 60, 18 * 60];
  return [Math.max(0, Math.floor(min / 60) * 60 - 60), Math.min(24 * 60, Math.ceil(max / 60) * 60 + 60)];
}

function TimeGrid({ columns, header, colorByStaff }: { columns: Column[]; header: (c: Column) => React.ReactNode; colorByStaff?: boolean }) {
  const { s, t, time } = useApp();
  const { highlight } = useUI();
  const L = lookup(s);
  const [from, to] = hoursRange(s, columns);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<{ col: number; minute: number } | null>(null);
  const lastDrag = useRef(0);
  const now = new Date();
  const nowMin = minutesOfDay(now);
  const todayKey = dateKey(now);

  // desplazar a la hora actual al abrir
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = columns.some((c) => c.day === todayKey) ? nowMin - 90 : from + 60;
    el.scrollTop = Math.max(0, (target - from) * PPM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.map((c) => c.key).join()]);

  useEffect(() => {
    if (!highlight) return;
    const id = setTimeout(() => uiActions.highlight(null), 2200);
    return () => clearTimeout(id);
  }, [highlight]);

  const pointToSlot = (x: number, y: number, grabOffset = 0) => {
    let col = 0;
    colRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (x >= r.left) col = i;
    });
    const el = colRefs.current[col]!;
    const r = el.getBoundingClientRect();
    const minute = Math.round(((y - r.top) / PPM + from - grabOffset) / SNAP) * SNAP;
    return { col, minute: Math.max(from, Math.min(to - SNAP, minute)) };
  };

  const startDrag = (e: React.PointerEvent, a: Appointment, colIndex: number, mode: 'move' | 'resize') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const st = minutesOfDay(parseLocal(a.start));
    const r = colRefs.current[colIndex]!.getBoundingClientRect();
    const pointerMin = (e.clientY - r.top) / PPM + from;
    setDrag({ id: a.id, mode, startX: e.clientX, startY: e.clientY, grabOffset: pointerMin - st, moved: false, col: colIndex, minute: st, duration: a.duration });
  };

  useEffect(() => {
    if (!drag) return;
    const a = s.appointments.find((x) => x.id === drag.id)!;
    const move = (e: PointerEvent) => {
      const moved = drag.moved || Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 5;
      if (!moved) return;
      if (drag.mode === 'move') {
        const p = pointToSlot(e.clientX, e.clientY, drag.grabOffset);
        setDrag((d) => d && { ...d, moved: true, col: p.col, minute: p.minute });
      } else {
        const r = colRefs.current[drag.col]!.getBoundingClientRect();
        const endMin = Math.round(((e.clientY - r.top) / PPM + from) / SNAP) * SNAP;
        setDrag((d) => d && { ...d, moved: true, duration: Math.max(SNAP, endMin - d.minute) });
      }
    };
    const cancel = () => setDrag(null);
    const up = () => {
      lastDrag.current = Date.now();
      if (!drag.moved) uiActions.openAppointment(drag.id);
      else if (drag.mode === 'move') {
        const col = columns[drag.col];
        const start = atMinutes(col.day, drag.minute);
        const staffId = col.dropStaff ?? a.staffId;
        if (start !== a.start || staffId !== a.staffId) moveAppointment(a.id, start, staffId);
      } else if (drag.duration !== a.duration) resizeAppointment(a.id, drag.duration);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('pointercancel', cancel, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  });

  const hours: number[] = [];
  for (let m = from; m < to; m += 60) hours.push(m);
  const height = (to - from) * PPM;
  const dragAppt = drag?.moved ? s.appointments.find((x) => x.id === drag.id) : undefined;

  return (
    <div className="tg-wrap" ref={scrollRef}>
      <div className="tg" style={{ ['--cols' as string]: columns.length, ['--hour' as string]: `${HOUR}px` }}>
        <div className="tg-head">
          <div className="tg-corner" />
          {columns.map((c) => (
            <div key={c.key} className="tg-headcell">
              {header(c)}
            </div>
          ))}
        </div>
        <div className="tg-body" style={{ height }}>
          <div className="tg-gutter">
            {hours.map((m) => (
              <span key={m} className="tg-hour" style={{ top: (m - from) * PPM }}>
                {time(m)}
              </span>
            ))}
          </div>
          {columns.map((c, ci) => {
            const day = c.day;
            const staffList = c.staffIds.map((id) => L.staff.get(id)!).filter(Boolean);
            // zonas no laborables
            let open: Interval[] = [];
            for (const st of staffList) open = open.concat(workingWindows(s, st, day));
            open.sort((a, b) => a[0] - b[0]);
            const merged: Interval[] = [];
            for (const iv of open) {
              const last = merged[merged.length - 1];
              if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
              else merged.push([...iv] as Interval);
            }
            const off: Interval[] = [];
            let cur = from;
            for (const [a, b] of merged) {
              if (a > cur) off.push([cur, Math.min(a, to)]);
              cur = Math.max(cur, b);
            }
            if (cur < to) off.push([cur, to]);

            const blocks = s.blocks.filter((b) => (!b.staffId || c.staffIds.includes(b.staffId)) && b.start.slice(0, 10) <= day && b.end.slice(0, 10) >= day);
            const items = (L.byDay.get(day) ?? []).filter((a) => c.staffIds.includes(a.staffId));
            const laid = layoutLanes(items, (a) => {
              const st = minutesOfDay(parseLocal(a.start));
              return [st, st + a.duration];
            });
            const closedAll = merged.length === 0;

            return (
              <div
                key={c.key}
                className={cx('tg-col', day === todayKey && 'is-today', closedAll && 'is-closed')}
                ref={(el) => {
                  colRefs.current[ci] = el;
                }}
                onPointerMove={(e) => {
                  if (drag || e.pointerType === 'touch' || (e.target as HTMLElement).closest('.ev')) return setHover(null);
                  const minute = Math.floor(((e.clientY - e.currentTarget.getBoundingClientRect().top) / PPM + from) / SNAP) * SNAP;
                  if (hover?.col !== ci || hover.minute !== minute) setHover({ col: ci, minute });
                }}
                onPointerLeave={() => setHover(null)}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.ev') || Date.now() - lastDrag.current < 300) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  const minute = Math.floor(((e.clientY - r.top) / PPM + from) / SNAP) * SNAP;
                  uiActions.newAppointment({ start: atMinutes(day, minute), staffId: c.dropStaff ?? null });
                }}
              >
                {hours.map((m) => (
                  <span key={m} className="tg-line" style={{ top: (m - from) * PPM }} />
                ))}
                {off.map(([a, b]) => (
                  <span key={a} className="tg-off" style={{ top: (a - from) * PPM, height: (b - a) * PPM }} />
                ))}
                {closedAll && <span className="tg-closed-label">{t('closed')}</span>}
                {blocks.map((b) => {
                  const bs = b.start.slice(0, 10) < day ? from : toMin(b.start.slice(11));
                  const be = b.end.slice(0, 10) > day ? to : toMin(b.end.slice(11));
                  return (
                    <span key={b.id} className="tg-block" style={{ top: (Math.max(bs, from) - from) * PPM, height: (Math.min(be, to) - Math.max(bs, from)) * PPM }}>
                      <Icon name="lock" size={12} /> {b.reason || t('blocked')}
                    </span>
                  );
                })}
                {hover && hover.col === ci && !drag && (
                  <span className="tg-hover" style={{ top: (hover.minute - from) * PPM, height: 30 * PPM }}>
                    <Icon name="plus" size={12} /> {time(hover.minute)}
                  </span>
                )}
                {day === todayKey && nowMin >= from && nowMin <= to && (
                  <span className="now-line" style={{ top: (nowMin - from) * PPM }}>
                    <span className="now-dot" />
                  </span>
                )}
                {laid.map((p) => {
                  const a = p.item;
                  const isDragging = drag?.id === a.id && drag.moved;
                  return (
                    <EventBlock
                      key={a.id}
                      a={a}
                      top={(p.start - from) * PPM}
                      height={(isDragging && drag.mode === 'resize' ? drag.duration : a.duration) * PPM}
                      left={p.lane / p.lanes}
                      width={1 / p.lanes}
                      ghost={isDragging && drag.mode === 'move'}
                      flash={highlight === a.id}
                      colorByStaff={colorByStaff}
                      onPointerDown={(e) => startDrag(e, a, ci, 'move')}
                      onResizeDown={(e) => startDrag(e, a, ci, 'resize')}
                    />
                  );
                })}
                {dragAppt && drag!.mode === 'move' && drag!.col === ci && (
                  <EventBlock a={{ ...dragAppt, start: atMinutes(day, drag!.minute) }} top={(drag!.minute - from) * PPM} height={dragAppt.duration * PPM} left={0} width={1} preview colorByStaff={colorByStaff} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  a,
  top,
  height,
  left,
  width,
  ghost,
  preview,
  flash,
  colorByStaff,
  onPointerDown,
  onResizeDown,
}: {
  a: Appointment;
  top: number;
  height: number;
  left: number;
  width: number;
  ghost?: boolean;
  preview?: boolean;
  flash?: boolean;
  colorByStaff?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onResizeDown?: (e: React.PointerEvent) => void;
}) {
  const { s, timeOf, time, status } = useApp();
  const L = lookup(s);
  const c = L.client.get(a.clientId);
  const svc = L.service.get(a.serviceId);
  const st = L.staff.get(a.staffId);
  const pet = c?.pets.find((p) => p.id === a.petId);
  const color = colorByStaff ? st?.color : svc?.color;
  const compact = height < 44;
  const startMin = minutesOfDay(parseLocal(a.start));
  return (
    <div
      className={cx('ev', `st-${a.status}`, compact && 'compact', ghost && 'ghost', preview && 'preview', flash && 'flash')}
      style={{ top, height: Math.max(height - 2, 18), left: `calc(${left * 100}% + 3px)`, width: `calc(${width * 100}% - 6px)`, ['--item' as string]: color }}
      onPointerDown={onPointerDown}
      title={`${timeOf(a.start)} · ${c?.name} · ${svc?.name} · ${status(a.status)}`}
    >
      <div className="ev-inner">
        <span className="ev-time">
          {preview ? `${time(startMin)} – ${time(startMin + a.duration)}` : timeOf(a.start)}
          {a.status === 'arrived' && <span className="live-dot" />}
          {a.status === 'completed' && <Icon name="check" size={11} strokeWidth={2.6} />}
          {a.source === 'online' && <Icon name="globe" size={11} />}
        </span>
        <span className="ev-name">
          {c?.name}
          {pet && <span className="ev-pet"> · {pet.name}</span>}
        </span>
        {height >= 60 && <span className="ev-svc">{svc?.name}</span>}
        {!compact && colorByStaff && height > 70 && st && <span className="ev-staff">{st.name}</span>}
      </div>
      {onResizeDown && <span className="ev-resize" onPointerDown={onResizeDown} />}
    </div>
  );
}

// ── Vista mensual ────────────────────────────────────────────────
function MonthView({ cursor, staffIds, onDay }: { cursor: Date; staffIds: string[]; onDay: (d: Date) => void }) {
  const { s, t, weekdaysShort, timeOf, moneyShort } = useApp();
  const L = lookup(s);
  const weeks = monthMatrix(cursor, s.business.weekStartsOn);
  const month = cursor.getMonth();
  return (
    <div className="month">
      <div className="month-head">
        {weeks[0].map((d) => (
          <span key={d.getDay()}>{weekdaysShort[d.getDay()]}</span>
        ))}
      </div>
      <div className="month-grid">
        {weeks.flat().map((d) => {
          const k = dateKey(d);
          const items = (L.byDay.get(k) ?? []).filter((a) => staffIds.includes(a.staffId) && a.status !== 'cancelled');
          const occ = items.length ? occupancy(s, k) : 0;
          const rev = items.filter((a) => a.status !== 'no_show').reduce((n, a) => n + a.price, 0);
          const closed = !s.business.hours[d.getDay()]?.open;
          return (
            <button key={k} className={cx('month-cell', d.getMonth() !== month && 'other', isToday(d) && 'is-today', closed && 'closed')} onClick={() => onDay(d)}>
              <span className="mc-top">
                <span className="mc-num">{d.getDate()}</span>
                {items.length > 0 && <span className="mc-rev tabular">{moneyShort(rev)}</span>}
              </span>
              {items.length > 0 && (
                <span className="mc-occ">
                  <span style={{ width: `${occ * 100}%` }} />
                </span>
              )}
              <span className="mc-items">
                {items.slice(0, 3).map((a) => (
                  <span key={a.id} className={cx('mc-item', `st-${a.status}`)} style={{ ['--item' as string]: L.service.get(a.serviceId)?.color }}>
                    <b>{timeOf(a.start)}</b> {L.client.get(a.clientId)?.name.split(' ')[0]}
                  </span>
                ))}
                {items.length > 3 && <span className="mc-more">{t('more_n', { n: items.length - 3 })}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista lista ──────────────────────────────────────────────────
function ListView({ from, staffIds }: { from: Date; staffIds: string[] }) {
  const { s, t, longDate, timeOf, time, status, money } = useApp();
  const L = lookup(s);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(from, i)), [from.getTime()]);
  return (
    <div className="list-view">
      {days.map((d) => {
        const items = (L.byDay.get(dateKey(d)) ?? []).filter((a) => staffIds.includes(a.staffId));
        if (!items.length) return null;
        return (
          <section key={dateKey(d)} className="lv-day">
            <header className="lv-head">
              <h3 className={cx(isToday(d) && 'accent-text')}>{longDate(d)}</h3>
              <span className="muted small">
                {t('appts_count', { n: items.filter((a) => a.status !== 'cancelled').length })} · {money(items.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').reduce((n, a) => n + a.price, 0))}
              </span>
            </header>
            {items.map((a) => {
              const c = L.client.get(a.clientId);
              const st = minutesOfDay(parseLocal(a.start));
              const pet = c?.pets.find((p) => p.id === a.petId);
              return (
                <button key={a.id} className={cx('lv-row', `st-${a.status}`)} onClick={() => uiActions.openAppointment(a.id)} style={{ ['--item' as string]: L.service.get(a.serviceId)?.color }}>
                  <span className="lv-time tabular">
                    {timeOf(a.start)}
                    <span className="muted">{time(st + a.duration)}</span>
                  </span>
                  <span className="lv-bar" />
                  <span className="grow">
                    <strong>{c?.name}</strong>
                    {pet && <span className="muted"> · {pet.name}</span>}
                    <span className="muted small block">{L.service.get(a.serviceId)?.name}</span>
                  </span>
                  <span className="lv-staff hide-mobile">
                    <Avatar name={L.staff.get(a.staffId)?.name ?? ''} color={L.staff.get(a.staffId)?.color} size={24} />
                    <span className="small">{L.staff.get(a.staffId)?.name}</span>
                  </span>
                  <StatusPill status={a.status} label={status(a.status)} />
                  <span className="tabular small lv-price hide-mobile">{money(a.price)}</span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
