import { useEffect, useMemo, useState } from 'react';
import type { BusinessType, DemoConfig } from '../types';
import { useApp } from '../lib/useApp';
import { useUI, uiActions } from '../store/ui';
import { undoLast, mutate } from '../store/actions';
import { go, type Route } from '../lib/router';
import { lookup } from '../lib/queries';
import { parseLocal } from '../lib/date';
import { digits } from '../lib/messaging';
import { PRESETS, pick } from '../config/presets';
import { FONT_PAIRS } from '../lib/theme';
import { demoUrl } from '../config/registry';
import { Avatar, Button, ColorDots, Drawer, Field, Segmented, cx, useEscape } from './ui';
import { Icon, type IconName } from './Icon';

// ── Avisos ─────────────────────────────────────────────────
export function Toasts() {
  const { toasts } = useUI();
  const { t } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={cx('toast', x.tone && `toast-${x.tone}`)}>
          <Icon name={x.tone === 'online' ? 'globe' : x.tone === 'success' ? 'check' : 'sparkle'} size={16} />
          <span>{x.text}</span>
          {x.undo && (
            <button className="toast-undo" onClick={() => (undoLast(), uiActions.dismissToast(x.id))}>
              <Icon name="undo" size={14} /> {t('undo')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Búsqueda global (Ctrl+K) ───────────────────────────────
export function CommandPalette() {
  const { palette } = useUI();
  const { s, t, timeOf, shortDate, nouns } = useApp();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  useEscape(() => uiActions.setPalette(false), palette);
  useEffect(() => {
    if (palette) {
      setQ('');
      setSel(0);
    }
  }, [palette]);

  const items = useMemo(() => {
    const out: { key: string; icon: IconName; label: string; sub?: string; color?: string; run: () => void }[] = [];
    const query = q.trim().toLowerCase();
    const nav: [Route, IconName, string][] = [
      ['today', 'home', t('nav_today')],
      ['calendar', 'calendar', t('nav_calendar')],
      ['clients', 'users', nouns.Clients],
      ['services', 'tag', t('nav_services')],
      ['staff', 'team', t('nav_staff')],
      ['reports', 'chart', t('nav_reports')],
      ['booking', 'globe', t('nav_booking')],
      ['automations', 'wand', t('nav_automations')],
      ['settings', 'settings', t('nav_settings')],
    ];
    if (!query) {
      out.push({ key: 'new', icon: 'plus', label: t('new_appt'), sub: 'N', run: () => uiActions.newAppointment() });
    }
    for (const [r, icon, label] of nav) if (!query || label.toLowerCase().includes(query)) out.push({ key: 'nav' + r, icon, label, sub: t('go_to'), run: () => (go(r), uiActions.setPalette(false)) });
    if (query) {
      const qd = query.replace(/\D/g, '');
      const cl = s.clients.filter((c) => c.name.toLowerCase().includes(query) || (qd.length > 2 && digits(c.phone).includes(qd)) || c.pets.some((p) => p.name.toLowerCase().includes(query))).slice(0, 6);
      for (const c of cl)
        out.push({ key: c.id, icon: 'user', label: c.name, sub: c.pets.length ? c.pets.map((p) => p.name).join(', ') : c.phone, run: () => uiActions.openClient(c.id) });
      const L = lookup(s);
      const ids = new Set(cl.map((c) => c.id));
      const svc = s.services.filter((x) => x.name.toLowerCase().includes(query)).map((x) => x.id);
      const now = new Date().toISOString().slice(0, 10);
      const appts = s.appointments
        .filter((a) => a.start >= now && (ids.has(a.clientId) || svc.includes(a.serviceId)))
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 6);
      for (const a of appts)
        out.push({
          key: a.id,
          icon: 'clock',
          label: `${L.client.get(a.clientId)?.name} · ${L.service.get(a.serviceId)?.name}`,
          sub: `${shortDate(parseLocal(a.start))} · ${timeOf(a.start)}`,
          color: L.service.get(a.serviceId)?.color,
          run: () => uiActions.openAppointment(a.id),
        });
    }
    return out;
  }, [q, s, t, nouns, shortDate, timeOf]);

  if (!palette) return null;
  const run = (i: number) => items[i]?.run();
  return (
    <div className="overlay center top" onMouseDown={(e) => e.target === e.currentTarget && uiActions.setPalette(false)}>
      <div className="palette">
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={q}
            placeholder={t('search_placeholder')}
            onChange={(e) => (setQ(e.target.value), setSel(0))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setSel((n) => Math.min(items.length - 1, n + 1)));
              if (e.key === 'ArrowUp') (e.preventDefault(), setSel((n) => Math.max(0, n - 1)));
              if (e.key === 'Enter') run(sel);
            }}
          />
          <kbd>esc</kbd>
        </div>
        <div className="palette-list">
          {items.length === 0 && <div className="palette-empty muted">{t('nothing_found')}</div>}
          {items.map((it, i) => (
            <button key={it.key} className={cx('palette-item', i === sel && 'on')} onMouseEnter={() => setSel(i)} onClick={() => run(i)} style={{ ['--item' as string]: it.color }}>
              <span className="palette-icon">
                <Icon name={it.icon} size={16} />
              </span>
              <span className="grow">{it.label}</span>
              {it.sub && <span className="muted small">{it.sub}</span>}
            </button>
          ))}
        </div>
        <div className="palette-foot muted small">{t('shortcut_help')}</div>
      </div>
    </div>
  );
}

// ── Personalizar demo en vivo ──────────────────────────────
const ACCENTS = ['#2f7a5c', '#b8456f', '#c8a063', '#2563a8', '#0f8b8d', '#8a6a45', '#7d3c62', '#e2552b', '#3f51b5', '#1f1f1f'];

export function Customizer({ fromFile }: { fromFile: boolean }) {
  const { customizer, mode } = useUI();
  const { s, t, lang } = useApp();
  const b = s.business;
  const [copied, setCopied] = useState(false);
  if (!customizer) return null;

  const setBiz = (patch: Partial<typeof b>) => mutate('business', (d) => Object.assign(d.business, patch));
  const setTheme = (patch: Partial<typeof b.theme>) => mutate('theme', (d) => Object.assign(d.business.theme, patch));

  const share = () => {
    const cfg: DemoConfig = {
      slug: s.slug,
      type: b.type,
      name: b.name,
      tagline: b.tagline,
      logo: b.logo,
      phone: b.phone,
      address: b.address,
      instagram: b.instagram,
      lang: b.lang,
      preparedFor: b.preparedFor,
      theme: b.theme,
    };
    navigator.clipboard?.writeText(demoUrl(cfg, false));
    setCopied(true);
    uiActions.toast(t('t_copied'), { tone: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer open onClose={() => uiActions.setCustomizer(false)} title={t('cz_title')} subtitle={t('cz_sub')} width={420}>
      <Field label={t('f_business_name')}>
        <input value={b.name} onChange={(e) => setBiz({ name: e.target.value })} />
      </Field>
      <Field label={t('f_tagline')}>
        <input value={b.tagline} onChange={(e) => setBiz({ tagline: e.target.value })} />
      </Field>
      <Field label={t('welcome_prepared')}>
        <input value={b.preparedFor ?? ''} onChange={(e) => setBiz({ preparedFor: e.target.value })} />
      </Field>
      <Field label={t('f_logo')}>
        <input value={b.logo ?? ''} placeholder="https://…/logo.png" onChange={(e) => setBiz({ logo: e.target.value })} />
      </Field>
      <div className="field">
        <span className="field-label">{t('cz_type')}</span>
        <div className="type-grid">
          {(Object.keys(PRESETS) as BusinessType[]).map((k) => (
            <button
              key={k}
              className={cx('type-card', b.type === k && 'on')}
              onClick={() => mutate('type', (d) => ((d.business.type = k), (d.business.theme = { ...PRESETS[k].theme })))}
            >
              <span className="type-emoji">{PRESETS[k].emoji}</span>
              <span>{pick(PRESETS[k].label, lang)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">{t('cz_accent')}</span>
        <ColorDots value={b.theme.accent} colors={ACCENTS} onChange={(c) => setTheme({ accent: c })} />
      </div>
      <div className="field">
        <span className="field-label">{t('cz_mode')}</span>
        <Segmented
          value={mode ?? b.theme.mode}
          options={[
            { value: 'light', label: t('cz_light') },
            { value: 'dark', label: t('cz_dark') },
          ]}
          onChange={(m) => (setTheme({ mode: m }), uiActions.setMode(m))}
        />
      </div>
      <Field label={t('cz_fonts')}>
        <select
          value={`${b.theme.fontDisplay}|${b.theme.fontBody}`}
          onChange={(e) => {
            const [fontDisplay, fontBody] = e.target.value.split('|');
            setTheme({ fontDisplay, fontBody });
          }}
        >
          {!FONT_PAIRS.some((f) => f.display === b.theme.fontDisplay && f.body === b.theme.fontBody) && (
            <option value={`${b.theme.fontDisplay}|${b.theme.fontBody}`}>
              {b.theme.fontDisplay} · {b.theme.fontBody}
            </option>
          )}
          {FONT_PAIRS.map((f) => (
            <option key={f.label} value={`${f.display}|${f.body}`}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`${t('cz_radius')} · ${b.theme.radius}px`}>
        <input type="range" min={0} max={24} value={b.theme.radius} onChange={(e) => setTheme({ radius: Number(e.target.value) })} />
      </Field>
      <div className="share-box">
        <strong>{t('cz_share')}</strong>
        <p className="muted small">{t('cz_share_hint')}</p>
        <div className="row gap-sm wrap">
          <Button variant="primary" icon={copied ? 'check' : 'link'} onClick={share}>
            {t('cz_copy')}
          </Button>
          <a className="btn btn-ghost btn-md" href={location.pathname}>
            <Icon name="wand" size={16} /> <span>{t('cz_studio')}</span>
          </a>
        </div>
        {fromFile && <p className="muted small mt-sm">?c={s.slug}</p>}
      </div>
    </Drawer>
  );
}

// ── Pantalla de bienvenida para el prospecto ───────────────
export function Welcome({ onEnter }: { onEnter: () => void }) {
  const { s, t } = useApp();
  const b = s.business;
  useEscape(onEnter);
  return (
    <div className="welcome" onClick={(e) => e.target === e.currentTarget && onEnter()}>
      <div className="welcome-card">
        <div className="welcome-brand">
          <Logo size={64} />
        </div>
        {b.preparedFor && (
          <p className="eyebrow">
            {t('welcome_prepared')} <strong>{b.preparedFor}</strong>
          </p>
        )}
        <h1 className="display welcome-name">{b.name}</h1>
        <p className="welcome-title">{t('welcome_title')}</p>
        <p className="muted">{t('welcome_body', { name: b.name })}</p>
        <ul className="welcome-features">
          <li>
            <Icon name="calendar" size={16} /> {t('welcome_f1')}
          </li>
          <li>
            <Icon name="whatsapp" size={16} /> {t('welcome_f2')}
          </li>
          <li>
            <Icon name="globe" size={16} /> {t('welcome_f3')}
          </li>
        </ul>
        <Button variant="primary" size="lg" iconRight="arrow" onClick={onEnter} autoFocus>
          {t('welcome_cta')}
        </Button>
      </div>
    </div>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  const { s, preset } = useApp();
  const b = s.business;
  const [broken, setBroken] = useState(false);
  if (b.logo && !broken) return <img className="logo-img" src={b.logo} alt={b.name} style={{ height: size, maxWidth: size * 3 }} onError={() => setBroken(true)} />;
  return (
    <span className="logo-mark" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      <span className="logo-letter">{b.name.trim().charAt(0).toUpperCase() || preset.emoji}</span>
    </span>
  );
}

export function StaffBadge({ id }: { id: string }) {
  const { s } = useApp();
  const st = s.staff.find((x) => x.id === id);
  if (!st) return null;
  return (
    <span className="staff-badge">
      <Avatar name={st.name} color={st.color} photo={st.photo} size={20} />
      {st.name.split(' ').slice(0, 2).join(' ')}
    </span>
  );
}
