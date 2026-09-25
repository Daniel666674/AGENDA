import { useEffect, useState } from 'react';
import type { ItemTag, MenuItem, OrderStatus } from '../types';
import { useMenuState } from '../store';
import { cx } from '../../components/ui';

export const STATUS_STEPS: { status: OrderStatus; label: string; title: string; sub: string; emoji: string }[] = [
  { status: 'new', label: 'Recibido', title: 'Pedido recibido', sub: 'La cocina ya lo tiene', emoji: '📩' },
  { status: 'preparing', label: 'Preparando', title: 'Preparando tu pedido', sub: 'Está en el fuego', emoji: '👨‍🍳' },
  { status: 'ready', label: 'Listo', title: '¡Listo! Va para tu mesa', sub: 'Un mesero lo lleva en un momento', emoji: '🛎️' },
  { status: 'delivered', label: 'En tu mesa', title: 'Servido en tu mesa', sub: '¡Buen provecho!', emoji: '😋' },
];

export const TAG_LABEL: Record<ItemTag, string> = {
  recomendado: '⭐ Recomendado',
  nuevo: 'Nuevo',
  picante: '🌶️ Picante',
  vegetariano: '🌱 Vegetariano',
  'para-compartir': 'Para compartir',
};

export function VenueLogo({ size = 40 }: { size?: number }) {
  const { venue } = useMenuState();
  const [broken, setBroken] = useState(false);
  if (venue.logo && !broken) return <img className="logo-img" src={venue.logo} alt={venue.name} style={{ height: size, maxWidth: size * 3 }} onError={() => setBroken(true)} />;
  return (
    <span className="logo-mark" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      <span className="logo-letter">{venue.name.trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}

/** Foto del plato; si no hay foto, una ilustración con el emoji sobre el color de la marca */
export function ItemArt({ item, big }: { item: MenuItem; big?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={cx('item-art', big && 'big', !item.available && 'off')}>
      {item.photo && !broken ? <img src={item.photo} alt="" onError={() => setBroken(true)} /> : <span className="item-emoji">{item.emoji}</span>}
    </span>
  );
}

/** Re-render periódico para cronómetros */
export function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

export function elapsed(from: number) {
  const s = Math.max(0, Math.floor((Date.now() - from) / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${String(s % 60).padStart(2, '0')}`;
}
