// Experiencia de reserva en línea (lo que ve el cliente final)
import { useMemo, useState } from 'react';
import type { Appointment, Service } from '../types';
import { useApp } from '../lib/useApp';
import { availableSlots, canPerform } from '../lib/availability';
import { addDays, atMinutes, dateKey, minutesOfDay, parseLocal, toLocal, toMin } from '../lib/date';
import { digits, downloadIcs, whatsappLink } from '../lib/messaging';
import { mutate, newClient } from '../store/actions';
import { getState, uid } from '../store/store';
import { uiActions } from '../store/ui';
import { go } from '../lib/router';
import { track } from '../lib/track';
import { Avatar, Button, cx } from '../components/ui';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Overlays';

type Step = 0 | 1 | 2 | 3 | 4 | 5;

export function BookingFlow({ embedded }: { embedded?: boolean }) {
  const { s, t, preset, money, time, timeOf, duration, date, longDate, nouns } = useApp();
  const b = s.business;
  const [step, setStep] = useState<Step>(0);
  const [service, setService] = useState<Service | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [day, setDay] = useState<string>('');
  const [slot, setSlot] = useState<{ minutes: number; staffIds: string[] } | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', pet: '', note: '' });
  const [booked, setBooked] = useState<Appointment | null>(null);

  const services = s.services.filter((x) => x.active && x.online);
  const cats = [...new Set(services.map((x) => x.category))];
  const eligible = service ? s.staff.filter((x) => canPerform(x, service.id)) : [];

  const days = useMemo(() => {
    if (!service) return [];
    const out = [];
    for (let i = 0; i < Math.min(21, b.bookingHorizonDays); i++) {
      const d = addDays(new Date(), i);
      const k = dateKey(d);
      const count = availableSlots(s, { service, staffId, day: k, leadMinutes: b.bookingLeadMinutes, step: 15 }).length;
      out.push({ d, k, count });
    }
    return out;
  }, [s, service, staffId]);

  const slots = useMemo(() => (service && day ? availableSlots(s, { service, staffId, day, leadMinutes: b.bookingLeadMinutes, step: service.duration >= 60 ? 30 : 15 }) : []), [s, service, staffId, day]);

  const now = new Date();
  const todayH = b.hours[now.getDay()];
  const nowM = minutesOfDay(now);
  const openNow = todayH?.open && nowM >= toMin(todayH.start) && nowM < toMin(todayH.end) && !(todayH.breakStart && todayH.breakEnd && nowM >= toMin(todayH.breakStart) && nowM < toMin(todayH.breakEnd));

  const confirm = () => {
    if (!service || !slot || !form.name.trim() || digits(form.phone).length < 7) return;
    const st = getState();
    let client = st.clients.find((c) => digits(c.phone).endsWith(digits(form.phone).slice(-8)));
    let petId: string | undefined;
    if (!client) {
      client = newClient({ name: form.name.trim(), phone: form.phone.trim(), tags: [t('src_online')] });
    }
    if (preset.usesPets && form.pet.trim()) {
      const existingPet = client.pets.find((p) => p.name.toLowerCase() === form.pet.trim().toLowerCase());
      if (existingPet) petId = existingPet.id;
      else {
        const pet = { id: uid('pet'), name: form.pet.trim(), species: '', breed: '' };
        client = { ...client, pets: [...client.pets, pet] };
        petId = pet.id;
      }
    }
    const staff = staffId ?? slot.staffIds[Math.floor(Math.random() * slot.staffIds.length)];
    const appt: Appointment = {
      id: uid('apt'),
      clientId: client.id,
      staffId: staff,
      serviceId: service.id,
      petId,
      start: atMinutes(day, slot.minutes),
      duration: service.duration,
      price: service.price,
      status: 'confirmed',
      notes: form.note,
      source: 'online',
      paid: false,
      reminded: false,
      createdAt: toLocal(new Date()),
    };
    const c = client;
    mutate('online', (d) => {
      const i = d.clients.findIndex((x) => x.id === c.id);
      if (i >= 0) d.clients[i] = c;
      else d.clients.push(c);
      d.appointments.push(appt);
    });
    uiActions.toast(t('t_booked_online', { name: c.name.split(' ')[0] }), { tone: 'online' });
    uiActions.highlight(appt.id);
    track('booking', service.name);
    setBooked(appt);
    setStep(5);
  };

  const reset = () => {
    setStep(0);
    setService(null);
    setStaffId(null);
    setDay('');
    setSlot(null);
    setForm({ name: '', phone: '', pet: '', note: '' });
    setBooked(null);
  };

  const pickService = (x: Service) => {
    setService(x);
    setSlot(null);
    const el = s.staff.filter((y) => canPerform(y, x.id));
    if (el.length <= 1) {
      setStaffId(el[0]?.id ?? null);
      setStep(3);
    } else setStep(2);
  };

  const back = () => setStep((x) => (x === 3 && eligible.length <= 1 ? 1 : Math.max(0, x - 1)) as Step);
  const stepTitles = [t('bk_step_service'), t('bk_step_staff'), t('bk_step_time'), t('bk_step_details')];

  return (
    <div className={cx('bk', embedded && 'bk-embedded')}>
      {step === 0 && (
        <div className="bk-hero">
          <div className="bk-cover">
            <span className="bk-cover-pattern" />
            <Logo size={72} />
          </div>
          <div className="bk-hero-body">
            <h1 className="display">{b.name}</h1>
            <p className="muted">{b.tagline}</p>
            <div className="bk-facts">
              <span className={cx('bk-open', openNow && 'on')}>
                <span className="pill-dot" /> {openNow ? t('bk_open_now') : t('bk_closed_now')}
                {todayH?.open && <span className="muted"> · {time(toMin(todayH.start))} – {time(toMin(todayH.end))}</span>}
              </span>
              {b.address && (
                <span>
                  <Icon name="pin" size={14} /> {b.address}
                </span>
              )}
              {b.instagram && (
                <span>
                  <Icon name="insta" size={14} /> {b.instagram}
                </span>
              )}
            </div>
            <Button variant="primary" size="lg" iconRight="arrow" className="bk-cta" onClick={() => setStep(1)}>
              {t('bk_book_now')}
            </Button>
            <div className="bk-teaser">
              {services.slice(0, 4).map((x) => (
                <button key={x.id} className="bk-teaser-item" onClick={() => pickService(x)}>
                  <span>{x.name}</span>
                  <span className="muted small">
                    {duration(x.duration)} · {money(x.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step >= 1 && step <= 4 && (
        <div className="bk-flow">
          <header className="bk-top">
            <button className="icon-btn" onClick={back} aria-label={t('bk_back')}>
              <Icon name="left" size={18} />
            </button>
            <div className="bk-top-title">
              <span className="muted small">{b.name}</span>
              <strong>{stepTitles[step - 1]}</strong>
            </div>
            <span className="bk-progress">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={cx(i <= step && 'on')} />
              ))}
            </span>
          </header>

          <div className="bk-scroll">
            {step === 1 &&
              cats.map((cat) => (
                <section key={cat} className="bk-cat">
                  <h4>{cat}</h4>
                  {services
                    .filter((x) => x.category === cat)
                    .map((x) => (
                      <button
                        key={x.id}
                        className={cx('bk-svc', service?.id === x.id && 'on')}
                        style={{ ['--item' as string]: x.color }}
                        onClick={() => pickService(x)}
                      >
                        <span className="grow">
                          <strong>{x.name}</strong>
                          {x.description && <span className="muted small block">{x.description}</span>}
                          <span className="muted small block">
                            <Icon name="clock" size={12} /> {duration(x.duration)}
                          </span>
                        </span>
                        <span className="bk-price">{x.price ? money(x.price) : '—'}</span>
                        <Icon name="right" size={16} />
                      </button>
                    ))}
                </section>
              ))}

            {step === 2 && (
              <div className="bk-staff">
                <button className={cx('bk-person', staffId === null && 'on')} onClick={() => (setStaffId(null), setSlot(null), setStep(3))}>
                  <span className="avatar avatar-any">
                    <Icon name="sparkle" size={18} />
                  </span>
                  <span className="grow">
                    <strong>{t('bk_any')}</strong>
                    <span className="muted small block">{t('bk_any_sub')}</span>
                  </span>
                  <Icon name="right" size={16} />
                </button>
                {eligible.map((x) => (
                  <button key={x.id} className={cx('bk-person', staffId === x.id && 'on')} onClick={() => (setStaffId(x.id), setSlot(null), setStep(3))}>
                    <Avatar name={x.name} color={x.color} photo={x.photo} size={44} />
                    <span className="grow">
                      <strong>{x.name}</strong>
                      <span className="muted small block">{x.role}</span>
                    </span>
                    <Icon name="right" size={16} />
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <>
                <div className="bk-days">
                  {days.map((d) => (
                    <button key={d.k} disabled={!d.count} className={cx('bk-day', day === d.k && 'on')} onClick={() => (setDay(d.k), setSlot(null))}>
                      <span className="small">{date(d.d, { weekday: 'short' }).replace('.', '')}</span>
                      <strong>{d.d.getDate()}</strong>
                      <span className="bk-day-dot" data-level={d.count > 12 ? 3 : d.count > 5 ? 2 : d.count ? 1 : 0} />
                    </button>
                  ))}
                </div>
                {!day && <p className="muted center-text mt-lg">{longDate(new Date())}</p>}
                {day && slots.length === 0 && <p className="muted center-text mt-lg">{t('bk_no_times')}</p>}
                {day &&
                  (['morning', 'afternoon', 'evening'] as const).map((g) => {
                    const list = slots.filter((x) => (g === 'morning' ? x.minutes < 720 : g === 'afternoon' ? x.minutes >= 720 && x.minutes < 1080 : x.minutes >= 1080));
                    if (!list.length) return null;
                    return (
                      <div key={g} className="bk-slot-group">
                        <h4>{t(g)}</h4>
                        <div className="bk-slots">
                          {list.map((x) => (
                            <button key={x.minutes} className={cx('slot', slot?.minutes === x.minutes && 'on')} onClick={() => setSlot(x)}>
                              {time(x.minutes)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

            {step === 4 && service && slot && (
              <div className="bk-details">
                <div className="bk-summary" style={{ ['--item' as string]: service.color }}>
                  <strong>{service.name}</strong>
                  <span>
                    {longDate(parseLocal(day + 'T12:00'))} · {time(slot.minutes)}
                  </span>
                  <span className="muted small">
                    {staffId ? s.staff.find((x) => x.id === staffId)?.name : t('bk_any')} · {duration(service.duration)} · {money(service.price)}
                  </span>
                </div>
                <label className="field">
                  <span className="field-label">{t('bk_your_name')}</span>
                  <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                </label>
                <label className="field">
                  <span className="field-label">{t('bk_your_phone')}</span>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" placeholder={b.phone.split(' ')[0] + ' …'} />
                </label>
                {preset.usesPets && (
                  <label className="field">
                    <span className="field-label">{t('bk_pet_name')}</span>
                    <input value={form.pet} onChange={(e) => setForm({ ...form, pet: e.target.value })} />
                  </label>
                )}
                <label className="field">
                  <span className="field-label">{t('bk_note')}</span>
                  <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                <p className="muted small">
                  <Icon name="check" size={12} /> {t('bk_policy')}
                </p>
              </div>
            )}
          </div>

          {(step === 3 || step === 4) && (
            <footer className="bk-foot">
              {step === 3 ? (
                <Button variant="primary" size="lg" disabled={!slot} onClick={() => setStep(4)} iconRight="arrow">
                  {slot ? `${t('bk_continue')} · ${time(slot.minutes)}` : t('bk_continue')}
                </Button>
              ) : (
                <Button variant="primary" size="lg" disabled={!form.name.trim() || digits(form.phone).length < 7} onClick={confirm} icon="check">
                  {t('bk_confirm')}
                </Button>
              )}
            </footer>
          )}
        </div>
      )}

      {step === 5 && booked && service && (
        <div className="bk-done">
          <div className="bk-check">
            <Icon name="check" size={34} strokeWidth={2.4} />
          </div>
          <h2 className="display">{t('bk_done_title', { name: form.name.split(' ')[0] })}</h2>
          <p className="muted">{t('bk_done_body')}</p>
          <div className="bk-summary big" style={{ ['--item' as string]: service.color }}>
            <strong>{service.name}</strong>
            <span>
              {longDate(parseLocal(booked.start))} · {timeOf(booked.start)}
            </span>
            <span className="muted small">
              {s.staff.find((x) => x.id === booked.staffId)?.name} · {b.address}
            </span>
          </div>
          <div className="col gap-sm full">
            <Button icon="calendar" onClick={() => downloadIcs(s, booked)}>
              {t('bk_add_calendar')}
            </Button>
            {b.whatsapp && (
              <a className="btn btn-soft btn-md" href={whatsappLink(b.whatsapp, `${b.name}: ${service.name} · ${longDate(parseLocal(booked.start))} ${timeOf(booked.start)}`)} target="_blank" rel="noreferrer">
                <Icon name="whatsapp" size={16} /> <span>WhatsApp</span>
              </a>
            )}
            <Button variant="ghost" onClick={reset}>
              {t('bk_another')}
            </Button>
            {!embedded && (
              <Button variant="ghost" icon="left" onClick={() => go('calendar', { v: 'day', d: booked.start.slice(0, 10) })}>
                {t('bk_back_admin')}
              </Button>
            )}
          </div>
        </div>
      )}
      <span className="sr-only">{nouns.clients}</span>
    </div>
  );
}

/** Página del panel: vista previa en un teléfono + explicación de venta */
export function BookingPreview() {
  const { t } = useApp();
  const link = `${location.origin}${location.pathname}${location.search}#/book`;
  return (
    <div className="page booking-page">
      <div className="booking-pitch">
        <p className="eyebrow">{t('nav_booking')}</p>
        <h1 className="display">{t('bk_preview_title')}</h1>
        <p className="muted lead">{t('bk_preview_body')}</p>
        <div className="link-box">
          <Icon name="link" size={16} />
          <span className="truncate">{link.replace(/^https?:\/\//, '')}</span>
        </div>
        <div className="row gap-sm wrap">
          <Button
            variant="primary"
            icon="copy"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              uiActions.toast(t('t_copied'), { tone: 'success' });
            }}
          >
            {t('bk_copy_link')}
          </Button>
          <a className="btn btn-soft btn-md" href="#/book">
            <Icon name="external" size={16} /> <span>{t('bk_open_full')}</span>
          </a>
        </div>
        <ul className="pitch-points">
          <li>
            <Icon name="clock" size={16} /> {t('welcome_f3')}
          </li>
          <li>
            <Icon name="whatsapp" size={16} /> {t('welcome_f2')}
          </li>
          <li>
            <Icon name="calendar" size={16} /> {t('bk_add_calendar')}
          </li>
        </ul>
      </div>
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <BookingFlow embedded />
        </div>
      </div>
    </div>
  );
}
