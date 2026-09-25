import { useEffect, useMemo, useState } from 'react';
import type { Appointment, Client, Status } from '../types';
import { useApp } from '../lib/useApp';
import { useUI, uiActions } from '../store/ui';
import { uid } from '../store/store';
import { deleteAppointment, mutate, newClient, remind, saveAppointment, setStatus, type Repeat } from '../store/actions';
import { availableSlots, canPerform, findConflicts } from '../lib/availability';
import { clientStats } from '../lib/queries';
import { atMinutes, dateKey, hm, minutesOfDay, parseLocal, roundTo, toLocal, toMin } from '../lib/date';
import { Avatar, Button, Drawer, Field, StatusPill, Toggle, cx } from './ui';
import { Icon } from './Icon';
import { digits } from '../lib/messaging';

const QUICK: { status: Status; icon: 'check' | 'user' | 'star' | 'x' | 'alert'; key: 'act_confirm' | 'act_arrived' | 'act_complete' | 'act_no_show' }[] = [
  { status: 'confirmed', icon: 'check', key: 'act_confirm' },
  { status: 'arrived', icon: 'user', key: 'act_arrived' },
  { status: 'completed', icon: 'star', key: 'act_complete' },
  { status: 'no_show', icon: 'alert', key: 'act_no_show' },
];

export function AppointmentEditor() {
  const ui = useUI();
  if (!ui.appt) return null;
  return <Editor key={ui.appt.id ?? 'new' + JSON.stringify(ui.appt.draft)} id={ui.appt.id} draft={ui.appt.draft ?? {}} />;
}

function Editor({ id, draft }: { id?: string; draft: NonNullable<ReturnType<typeof useUI>['appt']>['draft'] & object }) {
  const { s, t, preset, money, time, timeOf, longDate, status: stLabel, duration: dur } = useApp();
  const existing = id ? s.appointments.find((a) => a.id === id) : undefined;
  const services = s.services.filter((x) => x.active || x.id === existing?.serviceId);
  const initialService = s.services.find((x) => x.id === (existing?.serviceId ?? draft.serviceId)) ?? services[0];

  const nowRounded = useMemo(() => {
    const n = new Date();
    return atMinutes(n, roundTo(minutesOfDay(n) + 30, 15));
  }, []);

  const [form, setForm] = useState<Appointment>(
    () =>
      existing ?? {
        id: uid('apt'),
        clientId: draft.clientId ?? '',
        staffId: draft.staffId ?? '',
        serviceId: initialService?.id ?? '',
        start: draft.start ?? '',
        duration: initialService?.duration ?? 30,
        price: initialService?.price ?? 0,
        status: 'confirmed',
        notes: '',
        source: 'staff',
        paid: false,
        createdAt: toLocal(new Date()),
      },
  );
  const [day, setDay] = useState(() => (form.start || nowRounded).slice(0, 10));
  const [anyStaff, setAnyStaff] = useState(!existing && !draft.staffId);
  const [repeat, setRepeat] = useState<Repeat>({ every: 0, times: 6 });
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(!existing && !draft.clientId);
  const [quick, setQuick] = useState<Client | null>(null);
  const [newPet, setNewPet] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  const set = (patch: Partial<Appointment>) => setForm((f) => ({ ...f, ...patch }));
  const service = s.services.find((x) => x.id === form.serviceId);
  const client = quick ?? s.clients.find((c) => c.id === form.clientId);
  const staff = s.staff.find((x) => x.id === form.staffId);
  const stats = client && !quick ? clientStats(s, client.id) : null;

  // al cambiar de servicio, actualizar duración y precio
  const pickService = (sid: string) => {
    const sv = s.services.find((x) => x.id === sid);
    if (!sv) return;
    const patch: Partial<Appointment> = { serviceId: sid, duration: sv.duration, price: sv.price };
    if (form.staffId && !canPerform(s.staff.find((x) => x.id === form.staffId)!, sid)) setAnyStaff(true);
    set(patch);
  };

  const slots = useMemo(() => {
    if (!service) return [];
    return availableSlots(s, {
      service: { ...service, duration: form.duration },
      staffId: anyStaff ? null : form.staffId || null,
      day,
      excludeId: existing?.id,
    });
  }, [s, service, form.duration, form.staffId, anyStaff, day, existing?.id]);

  const selectedMin = form.start && form.start.startsWith(day) ? minutesOfDay(parseLocal(form.start)) : null;

  const groups = useMemo(() => {
    const g: Record<'morning' | 'afternoon' | 'evening', typeof slots> = { morning: [], afternoon: [], evening: [] };
    for (const sl of slots) g[sl.minutes < 720 ? 'morning' : sl.minutes < 1080 ? 'afternoon' : 'evening'].push(sl);
    return g;
  }, [slots]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? s.clients.filter((c) => c.name.toLowerCase().includes(q) || digits(c.phone).includes(q.replace(/\D/g, '') || '§') || c.pets.some((p) => p.name.toLowerCase().includes(q)))
      : [...s.clients].sort((a, b) => clientStats(s, b.id).visits - clientStats(s, a.id).visits);
    return list.slice(0, 7);
  }, [query, s]);

  const conflicts = form.start && form.staffId ? findConflicts(s, form) : [];
  const ready = !!(client?.name && form.serviceId && form.staffId && form.start);

  const pickSlot = (minutes: number, staffIds: string[]) => {
    const staffId = anyStaff ? (staffIds.includes(form.staffId) ? form.staffId : staffIds[0]) : form.staffId || staffIds[0];
    set({ start: atMinutes(day, minutes), staffId });
    setShowConflicts(false);
  };

  const submit = (force = false) => {
    if (!ready) return;
    if (conflicts.length && !force) {
      setShowConflicts(true);
      return;
    }
    let appt = { ...form };
    if (quick) {
      const c = { ...quick, pets: newPet ? [{ id: uid('pet'), name: newPet, species: '', breed: '' }] : [] };
      mutate('client', (d) => d.clients.push(c));
      appt = { ...appt, clientId: c.id, petId: c.pets[0]?.id };
    } else if (newPet && client) {
      const pet = { id: uid('pet'), name: newPet, species: '', breed: '' };
      mutate('pet', (d) => d.clients.find((c) => c.id === client.id)?.pets.push(pet));
      appt.petId = pet.id;
    }
    saveAppointment(appt, existing ? undefined : repeat);
    uiActions.highlight(appt.id);
    uiActions.closeAppointment();
  };

  const accent = service?.color;
  const title = existing ? (
    <span className="appt-title">
      {client?.name ?? t('unknown_client')}
      {existing.petId && client?.pets.find((p) => p.id === existing.petId) && (
        <span className="pet-chip">
          <Icon name="paw" size={13} /> {client.pets.find((p) => p.id === existing.petId)!.name}
        </span>
      )}
    </span>
  ) : (
    t('appt_new_title')
  );
  const subtitle = existing ? `${service?.name ?? ''} · ${longDate(parseLocal(existing.start))} · ${timeOf(existing.start)}` : undefined;

  return (
    <Drawer
      open
      onClose={uiActions.closeAppointment}
      title={title}
      subtitle={subtitle}
      accent={accent}
      width={520}
      footer={
        <>
          {existing &&
            (confirmDel ? (
              <Button variant="danger" icon="trash" onClick={() => (deleteAppointment(existing.id), uiActions.closeAppointment())}>
                {t('delete_confirm')}
              </Button>
            ) : (
              <Button variant="ghost" icon="trash" onClick={() => setConfirmDel(true)} aria-label={t('delete')} />
            ))}
          <span className="grow" />
          <Button variant="ghost" onClick={uiActions.closeAppointment}>
            {t('cancel')}
          </Button>
          <Button variant="primary" icon="check" disabled={!ready} onClick={() => submit(showConflicts)}>
            {showConflicts && conflicts.length ? t('save_anyway') : existing ? t('save') : t('save_appt')}
          </Button>
        </>
      }
    >
      {existing && (
        <div className="appt-quick">
          <div className="appt-quick-status">
            <StatusPill status={existing.status} label={stLabel(existing.status)} />
            <span className="muted small">
              {t(`src_${existing.source}`)} · {dur(existing.duration)} · {money(existing.price)}
            </span>
          </div>
          <div className="quick-actions">
            {QUICK.map((q) => (
              <button key={q.status} className={cx('qa', existing.status === q.status && 'on', `qa-${q.status}`)} onClick={() => (setStatus(existing.id, q.status), set({ status: q.status }))}>
                <Icon name={q.icon} size={16} />
                <span>{t(q.key)}</span>
              </button>
            ))}
            {client?.phone && (
              <button className="qa qa-wa" onClick={() => remind(existing)}>
                <Icon name="whatsapp" size={16} />
                <span>{t('act_remind')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cliente */}
      <div className="form-section">
        <div className="field-label">{t('f_client')}</div>
        {client && !pickerOpen ? (
          <div className="client-card">
            <Avatar name={client.name || '?'} size={42} />
            <div className="grow">
              <div className="row gap-sm">
                <strong>{client.name}</strong>
                {client.tags.map((tg) => (
                  <span key={tg} className="tag">
                    {tg}
                  </span>
                ))}
              </div>
              <div className="muted small">
                {client.phone}
                {stats && (
                  <>
                    {' · '}
                    {stats.visits ? `${stats.visits} ${t('visits')}` : t('first_time')}
                    {stats.noShows > 0 && <span className="warn-text"> · {stats.noShows} {t('st_no_show').toLowerCase()}</span>}
                  </>
                )}
              </div>
              {client.notes && <div className="client-note">{client.notes}</div>}
            </div>
            <div className="col gap-xs">
              {client.phone && (
                <a className="btn btn-ghost btn-sm btn-icon" href={`tel:${digits(client.phone)}`} aria-label={t('act_call')}>
                  <Icon name="phone" size={15} />
                </a>
              )}
              {!quick && (
                <Button size="sm" variant="ghost" icon="user" onClick={() => uiActions.openClient(client.id)} aria-label="profile" />
              )}
              {!existing && <Button size="sm" variant="ghost" icon="x" onClick={() => (setPickerOpen(true), setQuick(null), set({ clientId: '' }))} aria-label="change" />}
            </div>
          </div>
        ) : (
          <div className="combo">
            <div className="input-icon">
              <Icon name="search" size={16} />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('select_client')} />
            </div>
            <div className="combo-list">
              {matches.map((c) => (
                <button
                  key={c.id}
                  className="combo-item"
                  onClick={() => {
                    set({ clientId: c.id, petId: c.pets[0]?.id });
                    setPickerOpen(false);
                  }}
                >
                  <Avatar name={c.name} size={28} />
                  <span className="grow">
                    <strong>{c.name}</strong>
                    <span className="muted small"> {c.pets.length ? '· ' + c.pets.map((p) => p.name).join(', ') : c.phone}</span>
                  </span>
                  <Icon name="right" size={14} />
                </button>
              ))}
              {query.trim().length > 1 && (
                <button
                  className="combo-item combo-create"
                  onClick={() => {
                    setQuick(newClient({ name: query.trim().replace(/\b\w/g, (m) => m.toUpperCase()) }));
                    setPickerOpen(false);
                  }}
                >
                  <span className="avatar avatar-add">
                    <Icon name="plus" size={14} />
                  </span>
                  <strong>{t('create_client', { name: query.trim() })}</strong>
                </button>
              )}
            </div>
          </div>
        )}
        {quick && (
          <div className="grid-2 mt-sm">
            <Field label={t('f_phone')}>
              <input value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} placeholder="+52 …" autoFocus />
            </Field>
            <Field label={t('f_email')}>
              <input value={quick.email} onChange={(e) => setQuick({ ...quick, email: e.target.value })} />
            </Field>
          </div>
        )}
        {preset.usesPets && client && !pickerOpen && (
          <div className="pet-picker">
            {client.pets.map((p) => (
              <button key={p.id} className={cx('chip', form.petId === p.id && !newPet && 'on')} onClick={() => (set({ petId: p.id }), setNewPet(''))}>
                <Icon name="paw" size={13} /> {p.name}
                {p.species && <span className="muted"> · {p.species}</span>}
              </button>
            ))}
            <input className="chip-input" value={newPet} onChange={(e) => setNewPet(e.target.value)} placeholder={`+ ${t('f_pet')}`} />
          </div>
        )}
      </div>

      {/* Servicio + profesional */}
      <div className="grid-2">
        <Field label={t('f_service')}>
          <select value={form.serviceId} onChange={(e) => pickService(e.target.value)}>
            {[...new Set(services.map((x) => x.category))].map((cat) => (
              <optgroup key={cat} label={cat}>
                {services
                  .filter((x) => x.category === cat)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {dur(x.duration)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label={t('f_staff')}>
          <select
            value={anyStaff ? '*' : form.staffId}
            onChange={(e) => {
              if (e.target.value === '*') setAnyStaff(true);
              else {
                setAnyStaff(false);
                set({ staffId: e.target.value });
              }
            }}
          >
            {!existing && <option value="*">✦ {t('f_any_staff')}</option>}
            {s.staff
              .filter((x) => x.active || x.id === form.staffId)
              .map((x) => (
                <option key={x.id} value={x.id} disabled={!!service && !canPerform(x, service.id)}>
                  {x.name}
                </option>
              ))}
          </select>
        </Field>
      </div>

      {/* Fecha y hora */}
      <div className="form-section">
        <div className="row between">
          <div className="field-label">{t('free_slots')}</div>
          <div className="day-stepper">
            <Button size="sm" variant="ghost" icon="left" onClick={() => setDay(dateKey(new Date(parseLocal(day + 'T12:00').getTime() - 86400000)))} aria-label="prev" />
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
            <Button size="sm" variant="ghost" icon="right" onClick={() => setDay(dateKey(new Date(parseLocal(day + 'T12:00').getTime() + 86400000)))} aria-label="next" />
          </div>
        </div>
        <div className="muted small mb-xs">{longDate(parseLocal(day + 'T12:00'))}</div>
        {slots.length === 0 ? (
          <div className="notice">{t('no_slots')}</div>
        ) : (
          (['morning', 'afternoon', 'evening'] as const).map(
            (g) =>
              groups[g].length > 0 && (
                <div key={g} className="slot-group">
                  <span className="slot-group-label">{t(g)}</span>
                  <div className="slots">
                    {groups[g].map((sl) => (
                      <button key={sl.minutes} className={cx('slot', selectedMin === sl.minutes && 'on')} onClick={() => pickSlot(sl.minutes, sl.staffIds)}>
                        {time(sl.minutes)}
                      </button>
                    ))}
                  </div>
                </div>
              ),
          )
        )}
        <div className="grid-3 mt-sm">
          <Field label={t('manual_time')}>
            <input
              type="time"
              step={300}
              value={selectedMin !== null ? hm(selectedMin) : ''}
              onChange={(e) => {
                if (!e.target.value) return;
                const staffId = form.staffId || slots[0]?.staffIds[0] || s.staff.find((x) => service && canPerform(x, service.id))?.id || '';
                set({ start: atMinutes(day, toMin(e.target.value)), staffId });
              }}
            />
          </Field>
          <Field label={t('f_duration')}>
            <div className="input-suffix">
              <input type="number" min={5} step={5} value={form.duration} onChange={(e) => set({ duration: Math.max(5, Number(e.target.value)) })} />
              <span>{t('min')}</span>
            </div>
          </Field>
          <Field label={t('f_price')}>
            <input type="number" min={0} value={form.price} onChange={(e) => set({ price: Number(e.target.value) })} />
          </Field>
        </div>
        {form.start && staff && (
          <div className="selection-summary">
            <Icon name="clock" size={15} />
            <span>
              {longDate(parseLocal(form.start))} · <strong>{timeOf(form.start)}</strong> – {time(minutesOfDay(parseLocal(form.start)) + form.duration)}
            </span>
            <span className="grow" />
            <Avatar name={staff.name} color={staff.color} size={22} />
            <span className="small">{staff.name}</span>
          </div>
        )}
      </div>

      {showConflicts && conflicts.length > 0 && (
        <div className="conflicts">
          <strong>
            <Icon name="alert" size={16} /> {t('conflicts_title')}
          </strong>
          <ul>
            {conflicts.map((c, i) => (
              <li key={i}>{t(`cf_${c.kind}`, { detail: c.detail ?? '' })}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-2">
        <Field label={t('f_status')}>
          <select value={form.status} onChange={(e) => set({ status: e.target.value as Status })}>
            {(['pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled'] as Status[]).map((st) => (
              <option key={st} value={st}>
                {stLabel(st)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('f_source')}>
          <select value={form.source} onChange={(e) => set({ source: e.target.value as Appointment['source'] })}>
            {(['staff', 'phone', 'whatsapp', 'online'] as const).map((x) => (
              <option key={x} value={x}>
                {t(`src_${x}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!existing && (
        <div className="grid-2">
          <Field label={t('f_repeat')}>
            <select value={repeat.every} onChange={(e) => setRepeat({ ...repeat, every: Number(e.target.value) as Repeat['every'] })}>
              <option value={0}>{t('repeat_none')}</option>
              <option value={1}>{t('repeat_weekly')}</option>
              <option value={2}>{t('repeat_2w')}</option>
              <option value={4}>{t('repeat_4w')}</option>
            </select>
          </Field>
          {repeat.every > 0 && (
            <Field label={`× ${t('repeat_times')}`}>
              <input type="number" min={2} max={52} value={repeat.times} onChange={(e) => setRepeat({ ...repeat, times: Math.min(52, Math.max(2, Number(e.target.value))) })} />
            </Field>
          )}
        </div>
      )}

      <Field label={t('f_notes')}>
        <textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
      <Toggle checked={form.paid} onChange={(v) => set({ paid: v })} label={`${t('f_paid')} · ${money(form.price)}`} />
      {existing?.seriesId && (
        <p className="muted small mt-sm">
          <Icon name="repeat" size={13} /> {t('f_repeat')}
        </p>
      )}
    </Drawer>
  );
}

export function useKeepFresh() {
  // re-render cada minuto (línea de "ahora", cuentas regresivas)
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(i);
  }, []);
}
