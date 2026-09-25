import { useMemo, useState } from 'react';
import type { Staff as StaffT, TimeBlock } from '../types';
import { useApp } from '../lib/useApp';
import { mutate } from '../store/actions';
import { uid } from '../store/store';
import { addDays, dateKey, fromKey, parseLocal, startOfWeek } from '../lib/date';
import { workingWindows } from '../lib/availability';
import { SWATCHES } from '../config/presets';
import { go } from '../lib/router';
import { Avatar, Button, ColorDots, Field, Modal, PageHead, Toggle, cx } from '../components/ui';
import { HoursEditor } from '../components/HoursEditor';
import { Icon } from '../components/Icon';

export function StaffView() {
  const { s, t, money, weekdaysShort, date, timeOf } = useApp();
  const [edit, setEdit] = useState<StaffT | null>(null);
  const [block, setBlock] = useState<TimeBlock | null>(null);

  const week = useMemo(() => {
    const ws = startOfWeek(new Date(), s.business.weekStartsOn);
    const keys = Array.from({ length: 7 }, (_, i) => dateKey(addDays(ws, i)));
    const m = new Map<string, { count: number; rev: number; cap: number; used: number }>();
    for (const st of s.staff) {
      let cap = 0;
      for (const k of keys) cap += workingWindows(s, st, k).reduce((n, [a, b]) => n + b - a, 0);
      m.set(st.id, { count: 0, rev: 0, cap, used: 0 });
    }
    for (const a of s.appointments) {
      if (a.status === 'cancelled' || !keys.includes(a.start.slice(0, 10))) continue;
      const x = m.get(a.staffId);
      if (!x) continue;
      x.count++;
      x.used += a.duration;
      if (a.status !== 'no_show') x.rev += a.price;
    }
    return m;
  }, [s]);

  const upcomingBlocks = s.blocks.filter((b) => b.end >= dateKey(new Date())).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="page">
      <PageHead title={t('nav_staff')} sub={t('staff_sub', { n: s.staff.filter((x) => x.active).length })}>
        <Button icon="lock" onClick={() => setBlock({ id: uid('blk'), staffId: s.staff[0]?.id ?? null, start: dateKey(addDays(new Date(), 1)) + 'T14:00', end: dateKey(addDays(new Date(), 1)) + 'T16:00', reason: '' })}>
          {t('block_time')}
        </Button>
        <Button variant="primary" icon="plus" onClick={() => setEdit({ id: uid('stf'), name: '', role: '', color: SWATCHES[s.staff.length % SWATCHES.length], active: true, serviceIds: [] })}>
          {t('new_staff')}
        </Button>
      </PageHead>
      <div className="staff-grid">
        {s.staff.map((st) => {
          const w = week.get(st.id)!;
          const occ = w.cap ? w.used / w.cap : 0;
          const hours = st.hours ?? s.business.hours;
          return (
            <article key={st.id} className={cx('staff-card', !st.active && 'inactive')} style={{ ['--item' as string]: st.color }}>
              <div className="staff-top">
                <Avatar name={st.name} color={st.color} photo={st.photo} size={56} ring />
                <div className="grow">
                  <h3 className="display">{st.name}</h3>
                  <span className="muted">{st.role}</span>
                </div>
                <Button variant="ghost" icon="edit" onClick={() => setEdit(st)} aria-label={t('act_edit')} />
              </div>
              <div className="staff-days">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} className={cx('sd', hours[i]?.open && s.business.hours[i]?.open && 'on')}>
                    {weekdaysShort[i].charAt(0)}
                  </span>
                ))}
              </div>
              <div className="staff-stats">
                <div>
                  <span className="stat-num">{w.count}</span>
                  <span className="muted small">{t('appointments')}</span>
                </div>
                <div>
                  <span className="stat-num">{money(w.rev)}</span>
                  <span className="muted small">{t('r_revenue')}</span>
                </div>
                <div>
                  <span className="stat-num">{Math.round(occ * 100)}%</span>
                  <span className="muted small">{t('kpi_occupancy').split(' ')[0]}</span>
                </div>
              </div>
              <div className="kpi-meter">
                <span style={{ width: `${Math.min(100, occ * 100)}%` }} />
              </div>
              <div className="row between mt-sm">
                <span className="muted small">{t('this_week')}</span>
                <button className="link" onClick={() => go('calendar', { v: 'day', d: dateKey(new Date()) })}>
                  {t('see_calendar')} →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {upcomingBlocks.length > 0 && (
        <>
          <h3 className="section-title">{t('blocks')}</h3>
          <div className="block-list">
            {upcomingBlocks.map((b) => (
              <button key={b.id} className="block-item" onClick={() => setBlock(b)}>
                <Icon name="lock" size={15} />
                <strong>{b.reason || t('blocked')}</strong>
                <span className="muted small">
                  {b.staffId ? s.staff.find((x) => x.id === b.staffId)?.name : t('whole_team')} · {date(parseLocal(b.start), { weekday: 'short', day: 'numeric', month: 'short' })} {timeOf(b.start)} – {b.end.slice(0, 10) !== b.start.slice(0, 10) ? date(fromKey(b.end.slice(0, 10)), { day: 'numeric', month: 'short' }) + ' ' : ''}
                  {timeOf(b.end)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {edit && <StaffModal staff={edit} onClose={() => setEdit(null)} />}
      {block && <BlockModal block={block} onClose={() => setBlock(null)} />}
    </div>
  );
}

function StaffModal({ staff, onClose }: { staff: StaffT; onClose: () => void }) {
  const { s, t } = useApp();
  const [f, setF] = useState(staff);
  const exists = s.staff.some((x) => x.id === staff.id);
  const set = (p: Partial<StaffT>) => setF({ ...f, ...p });
  const save = () => {
    if (!f.name.trim()) return;
    mutate(t('save'), (d) => {
      const i = d.staff.findIndex((x) => x.id === f.id);
      if (i >= 0) d.staff[i] = f;
      else d.staff.push(f);
    });
    onClose();
  };
  return (
    <Modal
      open
      width={640}
      onClose={onClose}
      title={exists ? f.name : t('new_staff')}
      footer={
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={save} disabled={!f.name.trim()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="grid-2">
        <Field label={t('f_name')}>
          <input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label={t('f_role')}>
          <input value={f.role} onChange={(e) => set({ role: e.target.value })} />
        </Field>
      </div>
      <Field label={`Foto (URL) · ${t('optional')}`}>
        <input value={f.photo ?? ''} onChange={(e) => set({ photo: e.target.value || undefined })} placeholder="https://…" />
      </Field>
      <div className="field">
        <span className="field-label">{t('f_color')}</span>
        <ColorDots value={f.color} colors={SWATCHES} onChange={(color) => set({ color })} />
      </div>
      <div className="field">
        <span className="field-label">{t('f_services_done')}</span>
        <div className="chips">
          <button type="button" className={cx('chip', f.serviceIds.length === 0 && 'on')} onClick={() => set({ serviceIds: [] })}>
            {t('all_services')}
          </button>
          {s.services.map((x) => (
            <button
              type="button"
              key={x.id}
              className={cx('chip', f.serviceIds.includes(x.id) && 'on')}
              style={{ ['--item' as string]: x.color }}
              onClick={() => set({ serviceIds: f.serviceIds.includes(x.id) ? f.serviceIds.filter((y) => y !== x.id) : [...f.serviceIds, x.id] })}
            >
              {x.name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="row between">
          <span className="field-label">{t('f_hours')}</span>
          <Toggle checked={!!f.hours} onChange={(v) => set({ hours: v ? structuredClone(s.business.hours) : undefined })} label={f.hours ? t('own_hours') : t('same_as_business')} />
        </div>
        {f.hours && <HoursEditor value={f.hours} onChange={(hours) => set({ hours })} />}
      </div>
      <Toggle checked={f.active} onChange={(v) => set({ active: v })} label={t('f_active')} />
    </Modal>
  );
}

function BlockModal({ block, onClose }: { block: TimeBlock; onClose: () => void }) {
  const { s, t } = useApp();
  const [f, setF] = useState(block);
  const exists = s.blocks.some((b) => b.id === block.id);
  const valid = f.end > f.start;
  return (
    <Modal
      open
      onClose={onClose}
      title={t('block_time')}
      footer={
        <>
          {exists && <Button variant="ghost" icon="trash" onClick={() => (mutate(t('t_deleted'), (d) => (d.blocks = d.blocks.filter((b) => b.id !== f.id))), onClose())} aria-label={t('delete')} />}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              mutate(t('block_time'), (d) => {
                const i = d.blocks.findIndex((b) => b.id === f.id);
                if (i >= 0) d.blocks[i] = f;
                else d.blocks.push(f);
              });
              onClose();
            }}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <Field label={t('f_staff')}>
        <select value={f.staffId ?? ''} onChange={(e) => setF({ ...f, staffId: e.target.value || null })}>
          <option value="">{t('whole_team')}</option>
          {s.staff.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid-2">
        <Field label={t('f_from')}>
          <input type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        </Field>
        <Field label={t('f_to')}>
          <input type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        </Field>
      </div>
      <Field label={t('f_reason')}>
        <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
      </Field>
    </Modal>
  );
}
