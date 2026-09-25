// Demo de pedidos por QR: panel del local + vista del comensal
import { useEffect, useRef, useState } from 'react';
import type { MenuConfig, VenueType } from './types';
import { change, getMenu, initMenu, resetMenu, undoMenu, useMenuState } from './store';
import { randomOrder } from './seed';
import { VENUES } from './presets';
import { encodeMenu } from './registry';
import { applyTheme, FONT_PAIRS } from '../lib/theme';
import { Icon, type IconName } from '../components/Icon';
import { Button, ColorDots, Drawer, Field, Segmented, Toggle, cx, useEscape } from '../components/ui';
import { Customer } from './views/Customer';
import { Board } from './views/Board';
import { Tables, tableUrl } from './views/Tables';
import { MenuAdmin } from './views/MenuAdmin';
import { Sales } from './views/Sales';
import { QR } from './qr';
import { VenueLogo } from './views/shared';
import './menu.css';

type Route = 'pedidos' | 'mesas' | 'carta' | 'ventas' | 'cliente';

function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const f = () => setH(location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return h.replace(/^#\/?/, '');
}

// ── Avisos ───────────────────────────────────────────────
let pushToast: (t: string) => void = () => {};
export const menuToast = (t: string) => pushToast(t);

function Toasts() {
  const [list, setList] = useState<{ id: number; t: string }[]>([]);
  pushToast = (t) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, t }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4000);
  };
  return (
    <div className="toasts">
      {list.map((x) => (
        <div key={x.id} className="toast toast-online">
          <Icon name="bell" size={16} />
          <span>{x.t}</span>
        </div>
      ))}
    </div>
  );
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.16);
      o.stop(ctx.currentTime + i * 0.16 + 0.4);
    });
  } catch {
    /* sin audio */
  }
}

export function MenuDemo({ cfg }: { cfg: MenuConfig }) {
  const [ready] = useState(() => (initMenu(cfg), true));
  return ready ? <Shell cfg={cfg} /> : null;
}

const NAV: { route: Route; icon: IconName; label: string }[] = [
  { route: 'pedidos', icon: 'bell', label: 'Pedidos' },
  { route: 'mesas', icon: 'home', label: 'Mesas' },
  { route: 'carta', icon: 'list', label: 'Carta' },
  { route: 'ventas', icon: 'chart', label: 'Ventas' },
  { route: 'cliente', icon: 'phone', label: 'Vista del cliente' },
];

function Shell({ cfg }: { cfg: MenuConfig }) {
  const s = useMenuState();
  const hash = useHash();
  const v = s.venue;
  const [mode, setMode] = useState<'light' | 'dark' | null>(null);
  const [menu, setMenu] = useState(false);
  const [custom, setCustom] = useState(false);
  const [welcome, setWelcome] = useState(() => {
    try {
      return !sessionStorage.getItem(`menu-welcome:${s.slug}`);
    } catch {
      return true;
    }
  });
  const theme = mode ?? v.theme.mode;
  useEffect(() => applyTheme(v.theme, theme), [v.theme, theme]);
  useEffect(() => {
    document.title = `${v.name} · Pedidos`;
    document.documentElement.lang = 'es';
  }, [v.name]);
  useEffect(() => setMenu(false), [hash]);

  // Aviso cuando entra un pedido o una solicitud nueva (incluye otras pestañas)
  const seen = useRef({ orders: s.orders.length, reqs: s.requests.length });
  useEffect(() => {
    if (s.orders.length > seen.current.orders) {
      const o = s.orders[s.orders.length - 1];
      const t = s.tables.find((x) => x.id === o.tableId);
      if (!hash.startsWith('mesa/')) {
        menuToast(`Nuevo pedido · Mesa ${t?.number}`);
        chime();
      }
    }
    if (s.requests.length > seen.current.reqs && !hash.startsWith('mesa/')) {
      const r = s.requests[s.requests.length - 1];
      menuToast(`Mesa ${s.tables.find((x) => x.id === r.tableId)?.number} ${r.kind === 'bill' ? 'pide la cuenta' : 'llama al mesero'}`);
      chime();
    }
    seen.current = { orders: s.orders.length, reqs: s.requests.length };
  }, [s.orders.length, s.requests.length]);

  // Modo en vivo: entran pedidos de ejemplo para que el demo "se mueva"
  useEffect(() => {
    if (!s.live || hash.startsWith('mesa/')) return;
    let timer: number;
    const loop = () => {
      timer = window.setTimeout(() => {
        const st = getMenu();
        if (document.visibilityState === 'visible' && st.live) {
          const r = { next: Math.random, int: (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a, pick: <T,>(x: T[]) => x[Math.floor(Math.random() * x.length)], chance: (p: number) => Math.random() < p };
          const t = r.pick(st.tables);
          change((d) => {
            d.orders.push(randomOrder(d, t, r, d.nextNumber++, Date.now()));
          }, false);
        }
        loop();
      }, 35000 + Math.random() * 30000);
    };
    loop();
    return () => clearTimeout(timer);
  }, [s.live, hash]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        undoMenu();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Pantalla del comensal (lo que abre el QR)
  if (hash.startsWith('mesa/')) {
    const n = Number(hash.split('/')[1]);
    const t = s.tables.find((x) => x.number === n);
    return (
      <div className="qr-page">
        <Customer tableId={t?.id} />
      </div>
    );
  }

  const route = (NAV.find((n) => n.route === hash)?.route ?? 'pedidos') as Route;
  const active = s.orders.filter((o) => o.status === 'new').length + s.requests.filter((r) => !r.done).length;

  return (
    <div className={cx('app', menu && 'menu-open')}>
      <aside className="sidebar">
        <div className="brand">
          <VenueLogo size={38} />
          <div className="brand-text">
            <strong className="display">{v.name}</strong>
            <span className="muted small truncate">{v.tagline}</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.route} href={`#/${n.route}`} className={cx('nav-item', route === n.route && 'on')}>
              <Icon name={n.icon} size={19} />
              <span>{n.label}</span>
              {n.route === 'pedidos' && active > 0 && <span className="nav-count">{active}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <label className="nav-item live-toggle">
            <span className={cx('live-dot-lg', s.live && 'on')} />
            <span className="grow">Demo en vivo</span>
            <Toggle checked={s.live} onChange={(val) => change((d) => (d.live = val), false)} />
          </label>
          <button className="nav-item" onClick={() => setCustom(true)}>
            <Icon name="palette" size={19} />
            <span>Personalizar demo</span>
          </button>
          <button className="nav-item" onClick={() => setMode(theme === 'dark' ? 'light' : 'dark')}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
            <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setMenu(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn show-mobile" onClick={() => setMenu(true)} aria-label="menú">
            <Icon name="menu" size={20} />
          </button>
          <span className="topbar-brand show-mobile">
            <VenueLogo size={28} />
            <strong className="display">{v.name}</strong>
          </span>
          <span className="topbar-live hide-mobile">
            <span className={cx('live-dot-lg', s.live && 'on')} /> {s.live ? 'Recibiendo pedidos' : 'Demo en pausa'}
          </span>
          <span className="grow hide-mobile" />
          <a className="btn btn-primary btn-md" href="#/cliente">
            <Icon name="phone" size={17} />
            <span className="hide-mobile">Probar como cliente</span>
          </a>
        </header>
        <main className="content">
          {route === 'pedidos' && <Board />}
          {route === 'mesas' && <Tables />}
          {route === 'carta' && <MenuAdmin />}
          {route === 'ventas' && <Sales />}
          {route === 'cliente' && <Preview />}
        </main>
      </div>
      <nav className="tabbar">
        {NAV.map((n) => (
          <a key={n.route} href={`#/${n.route}`} className={cx('tab', route === n.route && 'on')}>
            <Icon name={n.icon} size={20} />
            <span>{n.label.split(' ')[0]}</span>
          </a>
        ))}
      </nav>
      <Toasts />
      {custom && <Customize cfg={cfg} onClose={() => setCustom(false)} onMode={setMode} mode={theme} />}
      {welcome && (
        <Welcome
          onEnter={() => {
            setWelcome(false);
            try {
              sessionStorage.setItem(`menu-welcome:${s.slug}`, '1');
            } catch {
              /* ignorar */
            }
          }}
        />
      )}
    </div>
  );
}

function Preview() {
  const s = useMenuState();
  const [tableId, setTableId] = useState(s.tables[Math.min(4, s.tables.length - 1)].id);
  const t = s.tables.find((x) => x.id === tableId)!;
  return (
    <div className="page booking-page">
      <div className="booking-pitch">
        <p className="eyebrow">Vista del cliente</p>
        <h1 className="display">Escanean, piden y listo.</h1>
        <p className="muted lead">
          Cada mesa tiene su código QR. El cliente ve la carta con fotos, pide desde su celular y el pedido llega directo a la cocina, sin esperar al mesero y sin errores al anotar. También puede llamar al mesero o pedir la cuenta con un toque.
        </p>
        <div className="row gap-lg wrap mt-lg">
          <div className="pv-qr">
            <QR value={tableUrl(t)} size={132} color="#16140f" />
          </div>
          <div className="col gap-sm">
            <Field label="Simular la mesa">
              <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                {s.tables.map((x) => (
                  <option key={x.id} value={x.id}>
                    Mesa {x.number} · {x.zone}
                  </option>
                ))}
              </select>
            </Field>
            <p className="muted small" style={{ maxWidth: 260 }}>
              Escanea el código con tu celular para probarlo, o pide desde el teléfono de al lado y mira cómo aparece en <a href="#/pedidos">Pedidos</a>.
            </p>
          </div>
        </div>
        <ul className="pitch-points">
          <li>
            <Icon name="clock" size={16} /> Pedidos más rápidos y mesas que rotan más
          </li>
          <li>
            <Icon name="check" size={16} /> Cero errores de comanda
          </li>
          <li>
            <Icon name="coin" size={16} /> Tickets más altos con sugerencias y adiciones
          </li>
        </ul>
      </div>
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <Customer key={tableId} tableId={tableId} embedded />
        </div>
      </div>
    </div>
  );
}

function Welcome({ onEnter }: { onEnter: () => void }) {
  const { venue } = useMenuState();
  useEscape(onEnter);
  return (
    <div className="welcome" onClick={(e) => e.target === e.currentTarget && onEnter()}>
      <div className="welcome-card">
        <div className="welcome-brand">
          <VenueLogo size={64} />
        </div>
        {venue.preparedFor && (
          <p className="eyebrow">
            Preparado especialmente para <strong>{venue.preparedFor}</strong>
          </p>
        )}
        <h1 className="display welcome-name">{venue.name}</h1>
        <p className="welcome-title">Tu carta digital con pedidos desde la mesa.</p>
        <p className="muted">Tus clientes escanean el QR, piden desde el celular y el pedido llega directo a cocina. Ya está armado con una carta de ejemplo para {venue.name}.</p>
        <ul className="welcome-features">
          <li>
            <Icon name="phone" size={16} /> Carta con fotos y pedidos desde la mesa
          </li>
          <li>
            <Icon name="bell" size={16} /> Tablero de cocina en tiempo real
          </li>
          <li>
            <Icon name="coin" size={16} /> Llamar al mesero y pedir la cuenta con un toque
          </li>
        </ul>
        <Button variant="primary" size="lg" iconRight="arrow" onClick={onEnter} autoFocus>
          Ver mi local en vivo
        </Button>
      </div>
    </div>
  );
}

const ACCENTS = ['#b5452b', '#6b4a33', '#d4a24c', '#e04e1b', '#2f7a5c', '#1f4e79', '#7d3c62', '#1f1f1f'];

function Customize({ cfg, onClose, onMode, mode }: { cfg: MenuConfig; onClose: () => void; onMode: (m: 'light' | 'dark') => void; mode: 'light' | 'dark' }) {
  const s = useMenuState();
  const v = s.venue;
  const [copied, setCopied] = useState(false);
  const setV = (p: Partial<typeof v>) => change((d) => Object.assign(d.venue, p), false);
  const setT = (p: Partial<typeof v.theme>) => change((d) => Object.assign(d.venue.theme, p), false);
  const share = () => {
    const c: MenuConfig = { slug: s.slug, type: v.type, name: v.name, tagline: v.tagline, logo: v.logo, phone: v.phone, address: v.address, instagram: v.instagram, preparedFor: v.preparedFor, wifi: v.wifi, tables: s.tables.length, theme: v.theme };
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}?md=${encodeMenu(c)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Drawer open onClose={onClose} title="Personalizar demo" subtitle="Ajústalo en vivo frente al cliente." width={420}>
      <Field label="Nombre del local">
        <input value={v.name} onChange={(e) => setV({ name: e.target.value })} />
      </Field>
      <Field label="Frase">
        <input value={v.tagline} onChange={(e) => setV({ tagline: e.target.value })} />
      </Field>
      <Field label="Preparado para">
        <input value={v.preparedFor ?? ''} onChange={(e) => setV({ preparedFor: e.target.value })} />
      </Field>
      <Field label="Logo (URL)">
        <input value={v.logo ?? ''} placeholder="https://…" onChange={(e) => setV({ logo: e.target.value })} />
      </Field>
      <Field label="Wi-Fi para clientes">
        <input value={v.wifi ?? ''} onChange={(e) => setV({ wifi: e.target.value })} />
      </Field>
      <div className="field">
        <span className="field-label">Color de marca</span>
        <ColorDots value={v.theme.accent} colors={ACCENTS} onChange={(accent) => setT({ accent })} />
      </div>
      <div className="field">
        <span className="field-label">Apariencia</span>
        <Segmented
          value={mode}
          onChange={(m) => (setT({ mode: m }), onMode(m))}
          options={[
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
        />
      </div>
      <Field label="Tipografía">
        <select
          value={`${v.theme.fontDisplay}|${v.theme.fontBody}`}
          onChange={(e) => {
            const [fontDisplay, fontBody] = e.target.value.split('|');
            setT({ fontDisplay, fontBody });
          }}
        >
          {!FONT_PAIRS.some((f) => f.display === v.theme.fontDisplay && f.body === v.theme.fontBody) && <option value={`${v.theme.fontDisplay}|${v.theme.fontBody}`}>{v.theme.fontDisplay} · {v.theme.fontBody}</option>}
          {FONT_PAIRS.map((f) => (
            <option key={f.label} value={`${f.display}|${f.body}`}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="share-box">
        <strong>Compartir este demo</strong>
        <p className="muted small">Enlace con el nombre, colores y logo actuales.</p>
        <div className="row gap-sm wrap">
          <Button variant="primary" icon={copied ? 'check' : 'link'} onClick={share}>
            {copied ? '¡Copiado!' : 'Copiar enlace'}
          </Button>
          <Button variant="ghost" icon="repeat" onClick={() => confirm('¿Reiniciar pedidos y carta de ejemplo?') && resetMenu(cfg)}>
            Reiniciar demo
          </Button>
        </div>
        <a className="link mt-sm" href={location.pathname}>
          ← Ir al estudio de demos
        </a>
      </div>
    </Drawer>
  );
}

export const VENUE_TYPES = Object.keys(VENUES) as VenueType[];
