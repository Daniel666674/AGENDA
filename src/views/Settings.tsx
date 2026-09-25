import { useRef } from 'react';
import type { AppState, Business } from '../types';
import { useApp } from '../lib/useApp';
import { mutate } from '../store/actions';
import { getState, replaceState, resetDemo } from '../store/store';
import { appointmentsCsv, download } from '../lib/messaging';
import { resolveDemo } from '../config/registry';
import { Button, Card, Field, PageHead, Segmented } from '../components/ui';
import { HoursEditor } from '../components/HoursEditor';
import { CURRENCY_LOCALE } from '../config/presets';

const CURRENCIES = ['MXN', 'USD', 'COP', 'EUR', 'ARS', 'CLP', 'PEN', 'GTQ', 'DOP', 'CRC', 'BOB', 'UYU', 'PYG', 'HNL', 'NIO', 'GBP', 'CAD'];

export function Settings() {
  const app = useApp();
  const { s, t, weekdaysLong } = app;
  const b = s.business;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Business>) => mutate(t('nav_settings'), (d) => Object.assign(d.business, patch));

  return (
    <div className="page settings">
      <PageHead title={t('nav_settings')} />
      <div className="settings-grid">
        <Card title={t('set_business')}>
          <Field label={t('f_business_name')}>
            <input value={b.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label={t('f_tagline')}>
            <input value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <div className="grid-2">
            <Field label={t('f_phone')}>
              <input value={b.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label={t('f_whatsapp')}>
              <input value={b.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
            </Field>
          </div>
          <Field label={t('f_address')}>
            <input value={b.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <div className="grid-2">
            <Field label={t('f_instagram')}>
              <input value={b.instagram} onChange={(e) => set({ instagram: e.target.value })} />
            </Field>
            <Field label={t('f_email')}>
              <input value={b.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </div>
          <Field label={t('f_logo')}>
            <input value={b.logo ?? ''} onChange={(e) => set({ logo: e.target.value })} placeholder="https://…" />
          </Field>
        </Card>

        <Card title={t('set_hours')}>
          <HoursEditor value={b.hours} onChange={(hours) => set({ hours })} />
          <Field label={t('f_slot')} className="mt-sm">
            <Segmented
              size="sm"
              value={String(b.slotMinutes)}
              onChange={(v) => set({ slotMinutes: Number(v) })}
              options={['10', '15', '20', '30'].map((v) => ({ value: v, label: `${v} ${t('min')}` }))}
            />
          </Field>
        </Card>

        <Card title={t('set_booking')}>
          <div className="grid-2">
            <Field label={t('f_lead')}>
              <div className="input-suffix">
                <input type="number" min={0} value={b.bookingLeadMinutes / 60} onChange={(e) => set({ bookingLeadMinutes: Math.max(0, Number(e.target.value)) * 60 })} />
                <span>{t('hours_unit')}</span>
              </div>
            </Field>
            <Field label={t('f_horizon')}>
              <div className="input-suffix">
                <input type="number" min={1} value={b.bookingHorizonDays} onChange={(e) => set({ bookingHorizonDays: Math.max(1, Number(e.target.value)) })} />
                <span>{t('days')}</span>
              </div>
            </Field>
          </div>
        </Card>

        <Card title={t('set_reminders')}>
          <Field label={t('f_template')} hint={t('f_template_hint')}>
            <textarea rows={5} value={b.reminderTemplate} onChange={(e) => set({ reminderTemplate: e.target.value })} />
          </Field>
        </Card>

        <Card title={t('set_region')}>
          <div className="grid-2">
            <Field label={t('f_lang')}>
              <select value={b.lang} onChange={(e) => set({ lang: e.target.value as Business['lang'] })}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label={t('f_currency')}>
              <select value={b.currency} onChange={(e) => set({ currency: e.target.value, locale: b.lang === 'en' && e.target.value !== 'USD' ? b.locale : CURRENCY_LOCALE[e.target.value] ?? b.locale })}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label={t('f_time_format')}>
              <Segmented
                size="sm"
                value={b.timeFormat}
                onChange={(v) => set({ timeFormat: v })}
                options={[
                  { value: '12h', label: '1:30 pm' },
                  { value: '24h', label: '13:30' },
                ]}
              />
            </Field>
            <Field label={t('f_week_start')}>
              <Segmented
                size="sm"
                value={String(b.weekStartsOn) as '0' | '1'}
                onChange={(v) => set({ weekStartsOn: Number(v) as 0 | 1 })}
                options={[
                  { value: '1', label: weekdaysLong[1] },
                  { value: '0', label: weekdaysLong[0] },
                ]}
              />
            </Field>
          </div>
        </Card>

        <Card title={t('set_data')}>
          <div className="col gap-sm">
            <Button icon="download" onClick={() => download(`agenda-${s.slug}.json`, JSON.stringify(getState(), null, 2), 'application/json')}>
              {t('export_json')}
            </Button>
            <Button icon="upload" onClick={() => fileRef.current?.click()}>
              {t('import_json')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const data = JSON.parse(await f.text()) as AppState;
                  if (data.business && Array.isArray(data.appointments)) replaceState({ ...data, slug: s.slug });
                } catch {
                  /* archivo inválido */
                }
                e.target.value = '';
              }}
            />
            <Button icon="list" onClick={() => download(`citas-${s.slug}.csv`, appointmentsCsv(s, app), 'text/csv')}>
              {t('export_csv')}
            </Button>
            <Button icon="printer" onClick={() => (location.hash = '/calendar?v=day', setTimeout(() => window.print(), 400))}>
              {t('print_day')}
            </Button>
            <Button
              variant="danger"
              icon="repeat"
              onClick={() => {
                const cfg = resolveDemo();
                if (cfg && confirm(t('reset_confirm'))) resetDemo(cfg);
              }}
            >
              {t('reset_demo')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
