// Estudio de demos: herramienta interna para crear un demo por prospecto en 1 minuto, sin tocar código.
import { useEffect, useMemo, useState } from 'react';
import type { BusinessType, DemoConfig, Lang } from '../types';
import { PRESETS, pick } from '../config/presets';
import { FILE_DEMOS, demoUrl, encodeConfig } from '../config/registry';
import { slugify } from '../config/seed';
import { FONT_PAIRS, inkOn, loadFonts } from '../lib/theme';
import { Button, ColorDots, Field, Segmented, cx } from '../components/ui';
import { Icon } from '../components/Icon';

const RECENT_KEY = 'agenda-studio:recent';
const ACCENTS = ['#2f7a5c', '#b8456f', '#c8a063', '#2563a8', '#0f8b8d', '#8a6a45', '#7d3c62', '#e2552b', '#3f51b5', '#1f1f1f'];

function readRecent(): DemoConfig[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function Studio() {
  const [type, setType] = useState<BusinessType>('barber');
  const preset = PRESETS[type];
  const [f, setF] = useState({ name: '', tagline: '', preparedFor: '', phone: '', address: '', instagram: '', logo: '', lang: 'es' as Lang });
  const [theme, setTheme] = useState({ ...preset.theme });
  const [recent, setRecent] = useState<DemoConfig[]>(readRecent);
  const [copied, setCopied] = useState<'' | 'link' | 'file'>('');

  useEffect(() => {
  }, []);
  useEffect(() => setTheme({ ...PRESETS[type].theme }), [type]);
  useEffect(() => loadFonts([theme.fontDisplay, theme.fontBody]), [theme.fontDisplay, theme.fontBody]);

  const cfg: DemoConfig = useMemo(() => {
    const name = f.name.trim() || pick(preset.label, f.lang);
    const c: DemoConfig = { slug: slugify(name) || 'demo', type, name, lang: f.lang, theme };
    if (f.tagline) c.tagline = f.tagline;
    if (f.preparedFor) c.preparedFor = f.preparedFor;
    if (f.phone) c.phone = f.phone;
    if (f.address) c.address = f.address;
    if (f.instagram) c.instagram = f.instagram;
    if (f.logo) c.logo = f.logo;
    return c;
  }, [f, type, theme, preset]);

  const remember = () => {
    const next = [cfg, ...recent.filter((r) => r.slug !== cfg.slug)].slice(0, 12);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento */
    }
  };

  const copy = (what: 'link' | 'file') => {
    const text =
      what === 'link'
        ? demoUrl(cfg, false)
        : `import type { DemoConfig } from '../types';\n\nconst demo: DemoConfig = ${JSON.stringify(cfg, null, 2)};\n\nexport default demo;\n`;
    navigator.clipboard?.writeText(text);
    remember();
    setCopied(what);
    setTimeout(() => setCopied(''), 1800);
  };

  const open = () => {
    remember();
    location.href = `${location.pathname}?d=${encodeConfig(cfg)}`;
  };

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  return (
    <>
      <header className="studio-head">
        <div>
          <p className="eyebrow">Agenda de citas · Estudio de demos</p>
          <h1 className="display">Un demo a la medida para cada prospecto.</h1>
          <p className="muted lead">Escribe el nombre del negocio, elige su giro y sus colores. En un clic tienes una agenda completa, con servicios, equipo y citas de ejemplo, lista para enviar.</p>
        </div>
      </header>

      <div className="studio-grid">
        <section className="studio-form card">
          <div className="card-body">
            <div className="field">
              <span className="field-label">1 · Giro del negocio</span>
              <div className="type-grid">
                {(Object.keys(PRESETS) as BusinessType[]).map((k) => (
                  <button key={k} className={cx('type-card', type === k && 'on')} onClick={() => setType(k)}>
                    <span className="type-emoji">{PRESETS[k].emoji}</span>
                    <span>{pick(PRESETS[k].label, 'es')}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field-label mt-lg">2 · Datos del prospecto</div>
            <div className="grid-2">
              <Field label="Nombre del negocio">
                <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={pick(preset.label, 'es')} autoFocus />
              </Field>
              <Field label="Preparado para (dueño/a)">
                <input value={f.preparedFor} onChange={(e) => set({ preparedFor: e.target.value })} placeholder="Ej. Dra. Mariana" />
              </Field>
            </div>
            <Field label="Frase / eslogan">
              <input value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder={pick(preset.tagline, f.lang)} />
            </Field>
            <div className="grid-2">
              <Field label="Teléfono / WhatsApp">
                <input value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+57 300 123 4567" />
              </Field>
              <Field label="Instagram">
                <input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@negocio" />
              </Field>
            </div>
            <Field label="Dirección">
              <input value={f.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Logo (URL de la imagen)" hint="Tip: clic derecho sobre su logo en Instagram/Google → Copiar dirección de imagen">
              <input value={f.logo} onChange={(e) => set({ logo: e.target.value })} placeholder="https://…" />
            </Field>
            <div className="grid-2">
              <Field label="Idioma">
                <Segmented
                  size="sm"
                  value={f.lang}
                  onChange={(lang) => set({ lang })}
                  options={[
                    { value: 'es', label: 'Español' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </Field>
            </div>

            <div className="field-label mt-lg">3 · Identidad visual</div>
            <div className="field">
              <span className="field-label">Color de marca</span>
              <ColorDots value={theme.accent} colors={ACCENTS} onChange={(accent) => setTheme({ ...theme, accent })} />
            </div>
            <div className="grid-2">
              <Field label="Apariencia">
                <Segmented
                  size="sm"
                  value={theme.mode}
                  onChange={(mode) => setTheme({ ...theme, mode })}
                  options={[
                    { value: 'light', label: 'Claro' },
                    { value: 'dark', label: 'Oscuro' },
                  ]}
                />
              </Field>
              <Field label="Tipografía">
                <select
                  value={`${theme.fontDisplay}|${theme.fontBody}`}
                  onChange={(e) => {
                    const [fontDisplay, fontBody] = e.target.value.split('|');
                    setTheme({ ...theme, fontDisplay, fontBody });
                  }}
                >
                  {!FONT_PAIRS.some((p) => p.display === theme.fontDisplay && p.body === theme.fontBody) && (
                    <option value={`${theme.fontDisplay}|${theme.fontBody}`}>
                      {theme.fontDisplay} · {theme.fontBody}
                    </option>
                  )}
                  {FONT_PAIRS.map((p) => (
                    <option key={p.label} value={`${p.display}|${p.body}`}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </section>

        <aside className="studio-side">
          <Preview cfg={cfg} />
          <div className="studio-actions">
            <Button variant="primary" size="lg" iconRight="arrow" onClick={open}>
              Abrir demo
            </Button>
            <Button icon={copied === 'link' ? 'check' : 'link'} onClick={() => copy('link')}>
              {copied === 'link' ? '¡Copiado!' : 'Copiar enlace para enviar'}
            </Button>
            <Button variant="ghost" icon={copied === 'file' ? 'check' : 'copy'} onClick={() => copy('file')}>
              {copied === 'file' ? '¡Copiado!' : `Copiar como archivo (src/clientes/${cfg.slug}.ts)`}
            </Button>
          </div>
          <p className="muted small">
            El enlace ya incluye todo (nombre, giro, colores, logo). Cada vez que el prospecto lo abre ve datos de ejemplo de <em>hoy</em>, y sus cambios se guardan en su navegador.
          </p>
        </aside>
      </div>

      {(recent.length > 0 || FILE_DEMOS.length > 0) && (
        <section className="studio-list">
          {recent.length > 0 && (
            <>
              <h3 className="section-title">Creados recientemente</h3>
              <div className="demo-cards">
                {recent.map((r) => (
                  <DemoCard key={'r' + r.slug} cfg={r} href={`?d=${encodeConfig(r)}`} />
                ))}
              </div>
            </>
          )}
          {FILE_DEMOS.length > 0 && (
            <>
              <h3 className="section-title">Demos guardados (src/clientes)</h3>
              <div className="demo-cards">
                {FILE_DEMOS.map((r) => (
                  <DemoCard key={'f' + r.slug} cfg={r} href={`?c=${r.slug}`} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

function DemoCard({ cfg, href }: { cfg: DemoConfig; href: string }) {
  const p = PRESETS[cfg.type] ?? PRESETS.generic;
  const accent = cfg.theme?.accent ?? p.theme.accent;
  return (
    <a className="demo-card" href={href} style={{ ['--item' as string]: accent }}>
      <span className="demo-card-mark" style={{ background: accent, color: inkOn(accent) }}>
        {cfg.name.charAt(0)}
      </span>
      <span className="grow">
        <strong>{cfg.name}</strong>
        <span className="muted small block">
          {p.emoji} {pick(p.label, 'es')}
          {cfg.preparedFor ? ` · ${cfg.preparedFor}` : ''}
        </span>
      </span>
      <Icon name="arrow" size={16} />
    </a>
  );
}

/** Miniatura en vivo del demo con la identidad elegida */
function Preview({ cfg }: { cfg: DemoConfig }) {
  const p = PRESETS[cfg.type];
  const th = { ...p.theme, ...cfg.theme };
  const dark = th.mode === 'dark';
  const svcs = p.services.slice(0, 5);
  const blocks = [
    { top: 8, h: 22, s: 0, col: 0, n: 'Ana G.' },
    { top: 36, h: 34, s: 1, col: 0, n: 'Luis R.' },
    { top: 14, h: 30, s: 2, col: 1, n: 'Sofía M.' },
    { top: 52, h: 20, s: 3, col: 1, n: 'Pablo T.' },
    { top: 4, h: 18, s: 4, col: 2, n: 'Carla D.' },
    { top: 28, h: 40, s: 0, col: 2, n: 'Emilio V.' },
  ];
  const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
  return (
    <div
      className={cx('preview', dark && 'preview-dark')}
      style={{
        ['--p-accent' as string]: th.accent,
        ['--p-on' as string]: inkOn(th.accent),
        ['--p-paper' as string]: th.paper,
        ['--p-radius' as string]: `${th.radius}px`,
        ['--p-display' as string]: `'${th.fontDisplay}', serif`,
        ['--p-body' as string]: `'${th.fontBody}', sans-serif`,
      }}
    >
      <div className="pv-side">
        {cfg.logo ? <img src={cfg.logo} alt="" className="pv-logo-img" /> : <span className="pv-logo">{cfg.name.charAt(0)}</span>}
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cx('pv-nav', i === 1 && 'on')} />
        ))}
      </div>
      <div className="pv-main">
        <div className="pv-top">
          <div>
            <span className="pv-eyebrow">{cfg.preparedFor ? `Para ${cfg.preparedFor}` : pick(p.label, 'es')}</span>
            <span className="pv-title">{cfg.name}</span>
          </div>
          <span className="pv-btn">+ Nueva cita</span>
        </div>
        <div className="pv-cal">
          {[0, 1, 2].map((c) => (
            <div key={c} className="pv-col">
              {blocks
                .filter((b) => b.col === c)
                .map((b, i) => (
                  <span key={i} className="pv-ev" style={{ top: `${b.top}%`, height: `${b.h}%`, ['--item' as string]: colors[b.s] }}>
                    <b>{b.n}</b>
                    <i>{pick(svcs[b.s]?.name ?? svcs[0].name, cfg.lang ?? 'es')}</i>
                  </span>
                ))}
            </div>
          ))}
          <span className="pv-now" />
        </div>
      </div>
    </div>
  );
}
