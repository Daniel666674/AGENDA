import { useMemo, useState } from 'react';
import type { Service } from '../types';
import { useApp } from '../lib/useApp';
import { mutate } from '../store/actions';
import { uid } from '../store/store';
import { addDays, dateKey } from '../lib/date';
import { SWATCHES } from '../config/presets';
import { Button, ColorDots, Field, Modal, PageHead, Toggle, cx } from '../components/ui';
import { Icon } from '../components/Icon';

export function Services() {
  const { s, t, money, duration } = useApp();
  const [edit, setEdit] = useState<Service | null>(null);
  const cats = [...new Set(s.services.map((x) => x.category))];

  const booked = useMemo(() => {
    const from = dateKey(addDays(new Date(), -30));
    const m = new Map<string, number>();
    for (const a of s.appointments) if (a.start >= from && a.status !== 'cancelled') m.set(a.serviceId, (m.get(a.serviceId) ?? 0) + 1);
    return m;
  }, [s.appointments]);
  const maxBooked = Math.max(1, ...booked.values());

  return (
    <div className="page">
      <PageHead title={t('nav_services')} sub={t('services_sub', { n: s.services.length, c: cats.length })}>
        <Button
          variant="primary"
          icon="plus"
          onClick={() =>
            setEdit({ id: uid('svc'), name: '', category: cats[0] ?? '', description: '', duration: 30, buffer: 0, price: 0, color: SWATCHES[s.services.length % SWATCHES.length], active: true, online: true })
          }
        >
          {t('new_service')}
        </Button>
      </PageHead>
      {cats.map((cat) => (
        <section key={cat} className="svc-section">
          <h3 className="section-title">{cat}</h3>
          <div className="svc-grid">
            {s.services
              .filter((x) => x.category === cat)
              .map((x) => (
                <button key={x.id} className={cx('svc-card', !x.active && 'inactive')} style={{ ['--item' as string]: x.color }} onClick={() => setEdit(x)}>
                  <span className="svc-swatch" />
                  <span className="svc-name">{x.name}</span>
                  {x.description && <span className="muted small">{x.description}</span>}
                  <span className="svc-meta">
                    <span>
                      <Icon name="clock" size={14} /> {duration(x.duration)}
                      {x.buffer > 0 && <span className="muted"> +{x.buffer}</span>}
                    </span>
                    <strong className="svc-price">{money(x.price)}</strong>
                  </span>
                  <span className="svc-pop">
                    <span className="svc-pop-bar">
                      <span style={{ width: `${((booked.get(x.id) ?? 0) / maxBooked) * 100}%` }} />
                    </span>
                    <span className="muted small">{t('booked_30', { n: booked.get(x.id) ?? 0 })}</span>
                  </span>
                  {x.online && (
                    <span className="svc-online" title={t('f_online')}>
                      <Icon name="globe" size={13} />
                    </span>
                  )}
                </button>
              ))}
          </div>
        </section>
      ))}
      {edit && <ServiceModal service={edit} cats={cats} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ServiceModal({ service, cats, onClose }: { service: Service; cats: string[]; onClose: () => void }) {
  const { s, t } = useApp();
  const [f, setF] = useState(service);
  const exists = s.services.some((x) => x.id === service.id);
  const inUse = s.appointments.some((a) => a.serviceId === service.id);
  const set = (p: Partial<Service>) => setF({ ...f, ...p });
  const save = () => {
    if (!f.name.trim()) return;
    mutate(t('save'), (d) => {
      const i = d.services.findIndex((x) => x.id === f.id);
      if (i >= 0) d.services[i] = f;
      else d.services.push(f);
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? f.name : t('new_service')}
      footer={
        <>
          {exists && !inUse && (
            <Button variant="ghost" icon="trash" onClick={() => (mutate(t('t_deleted'), (d) => (d.services = d.services.filter((x) => x.id !== f.id))), onClose())} aria-label={t('delete')} />
          )}
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
      <Field label={t('f_name')}>
        <input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid-2">
        <Field label={t('f_category')}>
          <input list="svc-cats" value={f.category} onChange={(e) => set({ category: e.target.value })} />
          <datalist id="svc-cats">
            {cats.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label={t('f_price')}>
          <input type="number" min={0} value={f.price} onChange={(e) => set({ price: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="grid-2">
        <Field label={t('f_duration')}>
          <div className="input-suffix">
            <input type="number" min={5} step={5} value={f.duration} onChange={(e) => set({ duration: Number(e.target.value) })} />
            <span>{t('min')}</span>
          </div>
        </Field>
        <Field label={t('f_buffer')} hint={t('f_buffer_hint')}>
          <div className="input-suffix">
            <input type="number" min={0} step={5} value={f.buffer} onChange={(e) => set({ buffer: Number(e.target.value) })} />
            <span>{t('min')}</span>
          </div>
        </Field>
      </div>
      <Field label={t('f_description')}>
        <textarea rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <div className="field">
        <span className="field-label">{t('f_color')}</span>
        <ColorDots value={f.color} colors={SWATCHES} onChange={(color) => set({ color })} />
      </div>
      <div className="row gap-lg wrap">
        <Toggle checked={f.online} onChange={(v) => set({ online: v })} label={t('f_online')} />
        <Toggle checked={f.active} onChange={(v) => set({ active: v })} label={t('f_active')} />
      </div>
    </Modal>
  );
}
