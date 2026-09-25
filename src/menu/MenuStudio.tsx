// Estudio: crear un demo de pedidos por QR para un restaurante, café o bar en 1 minuto
import { useEffect, useMemo, useState } from 'react';
import type { MenuConfig, VenueType } from './types';
import type { Seller } from '../config/sales';
import { VENUES } from './presets';
import { FILE_MENUS, encodeMenu } from './registry';
import { slugify } from '../config/seed';
import { FONT_PAIRS, inkOn, loadFonts } from '../lib/theme';
import { Button, ColorDots, Field, Segmented, cx } from '../components/ui';
import { Icon } from '../components/Icon';

const RECENT = 'menu-studio:recent';
const ACCENTS = ['#b5452b', '#6b4a33', '#d4a24c', '#e04e1b', '#2f7a5c', '#1f4e79', '#7d3c62', '#1f1f1f'];

function readRecent(): MenuConfig[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? '[]');
  } catch {
    return [];
  }
}

export function MenuStudio({ seller }: { seller: Seller }) {
  const [type, setType] = useState<VenueType>('restaurant');
  const preset = VENUES[type];
  const [f, setF] = useState({ name: '', tagline: '', preparedFor: '', phone: '', address: '', instagram: '', logo: '', tables: '' });
  const [theme, setTheme] = useState({ ...preset.theme });
  const [recent, setRecent] = useState<MenuConfig[]>(readRecent);
  const [copied, setCopied] = useState<'' | 'link' | 'file'>('');
  useEffect(() => setTheme({ ...VENUES[type].theme }), [type]);
  useEffect(() => loadFonts([theme.fontDisplay, theme.fontBody]), [theme.fontDisplay, theme.fontBody]);

  const cfg: MenuConfig = useMemo(() => {
    const name = f.name.trim() || preset.label;
    const c: MenuConfig = { slug: slugify(name) || 'local', type, name, theme };
    for (const k of ['tagline', 'preparedFor', 'phone', 'address', 'instagram', 'logo'] as const) if (f[k]) c[k] = f[k];
    if (Number(f.tables) > 0) c.tables = Math.min(60, Number(f.tables));
    if (seller.phone) c.seller = seller;
    return c;
  }, [f, type, theme, preset, seller]);

  const remember = () => {
    const next = [cfg, ...recent.filter((r) => r.slug !== cfg.slug)].slice(0, 12);
    setRecent(next);
    try {
      localStorage.setItem(RECENT, JSON.stringify(next));
    } catch {
      /* ignorar */
    }
  };
  const copy = (what: 'link' | 'file') => {
    navigator.clipboard?.writeText(
      what === 'link' ? `${location.origin}${location.pathname}?md=${encodeMenu(cfg)}` : `import type { MenuConfig } from '../menu/types';\n\nconst demo: MenuConfig = ${JSON.stringify(cfg, null, 2)};\n\nexport default demo;\n`,
    );
    remember();
    setCopied(what);
    setTimeout(() => setCopied(''), 1800);
  };
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const sample = preset.categories.flatMap((c) => c.items).slice(0, 4);

  return (
    <>
      <header className="studio-head">
        <p className="eyebrow">Pedidos por QR · Estudio de demos</p>
        <h1 className="display">La carta digital de tu prospecto, lista en un minuto.</h1>
        <p className="muted lead">Restaurantes, cafés, bares y comida rápida: el cliente escanea el QR de la mesa, pide desde su celular y el pedido llega a la cocina.</p>
      </header>
      <div className="studio-grid">
        <section className="studio-form card">
          <div className="card-body">
            <div className="field">
              <span className="field-label">1 · Tipo de local</span>
              <div className="type-grid four">
                {(Object.keys(VENUES) as VenueType[]).map((k) => (
                  <button key={k} className={cx('type-card', type === k && 'on')} onClick={() => setType(k)}>
                    <span className="type-emoji">{VENUES[k].emoji}</span>
                    <span>{VENUES[k].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field-label mt-lg">2 · Datos del prospecto</div>
            <div className="grid-2">
              <Field label="Nombre del local">
                <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={preset.label} autoFocus />
              </Field>
              <Field label="Preparado para (dueño/a)">
                <input value={f.preparedFor} onChange={(e) => set({ preparedFor: e.target.value })} placeholder="Ej. Don Jorge" />
              </Field>
            </div>
            <Field label="Frase / eslogan">
              <input value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder={preset.tagline} />
            </Field>
            <div className="grid-2">
              <Field label="Instagram">
                <input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@local" />
              </Field>
              <Field label="Número de mesas">
                <input type="number" min={1} max={60} value={f.tables} onChange={(e) => set({ tables: e.target.value })} placeholder={String(preset.zones.reduce((a, [, n]) => a + n, 0))} />
              </Field>
            </div>
            <Field label="Dirección">
              <input value={f.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Logo (URL de la imagen)" hint="Clic derecho sobre su logo en Instagram/Google → Copiar dirección de imagen">
              <input value={f.logo} onChange={(e) => set({ logo: e.target.value })} placeholder="https://…" />
            </Field>
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
          <div
            className={cx('mpv', theme.mode === 'dark' && 'mpv-dark')}
            style={{ ['--p-accent' as string]: theme.accent, ['--p-on' as string]: inkOn(theme.accent), ['--p-paper' as string]: theme.paper, ['--p-display' as string]: `'${theme.fontDisplay}', serif`, ['--p-body' as string]: `'${theme.fontBody}', sans-serif`, ['--p-radius' as string]: `${theme.radius}px` }}
          >
            <div className="mpv-cover">
              {cfg.logo ? <img src={cfg.logo} alt="" /> : <span>{cfg.name.charAt(0)}</span>}
              <em>Mesa 5 · Salón</em>
            </div>
            <div className="mpv-body">
              <strong className="mpv-name">{cfg.name}</strong>
              <span className="mpv-tag">{f.tagline || preset.tagline}</span>
              <div className="mpv-tabs">
                {preset.categories.slice(0, 3).map((c, i) => (
                  <span key={c.name} className={cx(i === 0 && 'on')}>
                    {c.emoji} {c.name}
                  </span>
                ))}
              </div>
              {sample.map((it) => (
                <div key={it.name} className="mpv-item">
                  <span className="grow">
                    <b>{it.name}</b>
                    <i>{it.description}</i>
                    <u>${it.price.toLocaleString('es-CO')}</u>
                  </span>
                  <span className="mpv-art">{it.emoji}</span>
                </div>
              ))}
              <span className="mpv-cart">Ver mi pedido · 2</span>
            </div>
          </div>
          <div className="studio-actions">
            <Button
              variant="primary"
              size="lg"
              iconRight="arrow"
              onClick={() => {
                remember();
                location.href = `${location.pathname}?md=${encodeMenu(cfg)}`;
              }}
            >
              Abrir demo
            </Button>
            <Button icon={copied === 'link' ? 'check' : 'link'} onClick={() => copy('link')}>
              {copied === 'link' ? '¡Copiado!' : 'Copiar enlace para enviar'}
            </Button>
            <Button variant="ghost" icon={copied === 'file' ? 'check' : 'copy'} onClick={() => copy('file')}>
              {copied === 'file' ? '¡Copiado!' : `Copiar como archivo (src/restaurantes/${cfg.slug}.ts)`}
            </Button>
          </div>
          <p className="muted small">El demo trae una carta de ejemplo del tipo de local, mesas ocupadas y pedidos entrando en vivo. Puedes cambiar precios, fotos y platos desde "Carta".</p>
        </aside>
      </div>

      {(recent.length > 0 || FILE_MENUS.length > 0) && (
        <section className="studio-list">
          {recent.length > 0 && (
            <>
              <h3 className="section-title">Creados recientemente</h3>
              <div className="demo-cards">
                {recent.map((r) => (
                  <MenuCard key={'r' + r.slug} cfg={r} href={`?md=${encodeMenu(r)}`} />
                ))}
              </div>
            </>
          )}
          <h3 className="section-title">Demos guardados (src/restaurantes)</h3>
          <div className="demo-cards">
            {FILE_MENUS.map((r) => (
              <MenuCard key={'f' + r.slug} cfg={r} href={`?m=${r.slug}`} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function MenuCard({ cfg, href }: { cfg: MenuConfig; href: string }) {
  const p = VENUES[cfg.type];
  const accent = cfg.theme?.accent ?? p.theme.accent;
  return (
    <a className="demo-card" href={href} style={{ ['--item' as string]: accent }}>
      <span className="demo-card-mark" style={{ background: accent, color: inkOn(accent) }}>
        {cfg.name.charAt(0)}
      </span>
      <span className="grow">
        <strong>{cfg.name}</strong>
        <span className="muted small block">
          {p.emoji} {p.label}
          {cfg.preparedFor ? ` · ${cfg.preparedFor}` : ''}
        </span>
      </span>
      <Icon name="arrow" size={16} />
    </a>
  );
}
