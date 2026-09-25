// Portada del estudio: elegir qué producto demostrar
import { useEffect, useState } from 'react';
import { applyTheme } from '../lib/theme';
import { Studio } from './Studio';
import { MenuStudio } from '../menu/MenuStudio';
import { Icon } from '../components/Icon';
import { cx } from '../components/ui';
import '../menu/menu.css';

type Product = 'agenda' | 'menu';

export function StudioHome() {
  const [p, setP] = useState<Product>(() => (location.hash === '#restaurantes' ? 'menu' : 'agenda'));
  useEffect(() => {
    applyTheme({ accent: '#1c1b19', paper: '#f4f2ee', mode: 'light', fontDisplay: 'Instrument Serif', fontBody: 'Inter Tight', radius: 12 }, 'light');
  }, []);
  useEffect(() => {
    document.title = p === 'menu' ? 'Estudio · Pedidos por QR' : 'Estudio · Agenda';
    history.replaceState(null, '', p === 'menu' ? '#restaurantes' : location.pathname);
  }, [p]);
  return (
    <div className="studio">
      <div className="product-switch">
        <button className={cx(p === 'agenda' && 'on')} onClick={() => setP('agenda')}>
          <Icon name="calendar" size={18} />
          <span>
            <strong>Agenda de citas</strong>
            <em>Veterinarias, spas, barberías, consultorios…</em>
          </span>
        </button>
        <button className={cx(p === 'menu' && 'on')} onClick={() => setP('menu')}>
          <Icon name="phone" size={18} />
          <span>
            <strong>Pedidos por QR</strong>
            <em>Restaurantes, cafés, bares, comida rápida…</em>
          </span>
        </button>
      </div>
      {p === 'agenda' ? <Studio /> : <MenuStudio />}
    </div>
  );
}
