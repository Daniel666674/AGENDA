// Portada del estudio: elegir qué producto demostrar y hacer seguimiento
import { useEffect, useState } from 'react';
import { applyTheme } from '../lib/theme';
import { markOwnerBrowser } from '../lib/track';
import { savedSeller, saveSeller, type Seller } from '../config/sales';
import { Studio } from './Studio';
import { MenuStudio } from '../menu/MenuStudio';
import { Tracking } from './Tracking';
import { Icon } from '../components/Icon';
import { cx } from '../components/ui';
import '../menu/menu.css';

type Tab = 'agenda' | 'menu' | 'seguimiento';
const HASH: Record<Tab, string> = { agenda: '', menu: '#restaurantes', seguimiento: '#seguimiento' };

export function StudioHome() {
  const [tab, setTab] = useState<Tab>(() => (location.hash === '#restaurantes' ? 'menu' : location.hash === '#seguimiento' ? 'seguimiento' : 'agenda'));
  const [seller, setSeller] = useState<Seller>(savedSeller);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    applyTheme({ accent: '#1c1b19', paper: '#f4f2ee', mode: 'light', fontDisplay: 'Instrument Serif', fontBody: 'Inter Tight', radius: 12 }, 'light');
    // Quien usa el estudio es el vendedor: sus propias visitas a los demos no cuentan
    markOwnerBrowser(true);
  }, []);
  useEffect(() => {
    document.title = tab === 'menu' ? 'Estudio · Pedidos por QR' : tab === 'seguimiento' ? 'Estudio · Seguimiento' : 'Estudio · Agenda';
    history.replaceState(null, '', location.pathname + HASH[tab]);
  }, [tab]);

  const update = (p: Partial<Seller>) => {
    const next = { ...seller, ...p };
    setSeller(next);
    saveSeller(next);
  };

  return (
    <div className="studio">
      <div className="studio-top">
        <div className="product-switch three">
          <button className={cx(tab === 'agenda' && 'on')} onClick={() => setTab('agenda')}>
            <Icon name="calendar" size={18} />
            <span>
              <strong>Agenda de citas</strong>
              <em>Veterinarias, spas, barberías…</em>
            </span>
          </button>
          <button className={cx(tab === 'menu' && 'on')} onClick={() => setTab('menu')}>
            <Icon name="phone" size={18} />
            <span>
              <strong>Pedidos por QR</strong>
              <em>Restaurantes, cafés, bares…</em>
            </span>
          </button>
          <button className={cx(tab === 'seguimiento' && 'on')} onClick={() => setTab('seguimiento')}>
            <Icon name="chart" size={18} />
            <span>
              <strong>Seguimiento</strong>
              <em>Quién abrió su demo</em>
            </span>
          </button>
        </div>

        <div className={cx('seller-card', !seller.phone && 'missing')}>
          <span className="seller-icon">
            <Icon name="whatsapp" size={18} />
          </span>
          {editing || !seller.phone ? (
            <form
              className="seller-form"
              onSubmit={(e) => {
                e.preventDefault();
                setEditing(false);
              }}
            >
              <span className="small">
                <strong>Tu contacto de ventas.</strong> Recibe el "Quiero activarlo" de cada demo que crees.
              </span>
              <input id="seller-name" value={seller.name} placeholder="Tu nombre" onChange={(e) => update({ name: e.target.value })} />
              <input id="seller-phone" value={seller.phone} placeholder="+57 300 123 4567" onChange={(e) => update({ phone: e.target.value })} />
              {seller.phone && (
                <button className="btn btn-primary btn-sm" type="submit">
                  Listo
                </button>
              )}
            </form>
          ) : (
            <button className="seller-view" onClick={() => setEditing(true)}>
              <span className="small muted">Los demos que crees le escriben a</span>
              <strong>
                {seller.name} · {seller.phone}
              </strong>
              <span className="link small">Cambiar</span>
            </button>
          )}
        </div>
      </div>
      {tab === 'agenda' && <Studio seller={seller} />}
      {tab === 'menu' && <MenuStudio seller={seller} />}
      {tab === 'seguimiento' && <Tracking />}
    </div>
  );
}
