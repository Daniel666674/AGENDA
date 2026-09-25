// ─────────────────────────────────────────────────────────────
// Ventas: a quién le llega el "Quiero activarlo" y qué planes se ofrecen.
// Cada demo creado en el Estudio lleva el vendedor que lo generó;
// los demos guardados como archivo usan este vendedor por defecto.
// ─────────────────────────────────────────────────────────────
export interface Seller {
  name: string;
  /** WhatsApp con indicativo, ej: +57 300 123 4567 */
  phone: string;
}

export const DEFAULT_SELLER: Seller = {
  name: 'Daniel Acosta',
  phone: '+57 313 666 2777',
};

export const PLANS = {
  agenda: [
    { id: 'Esencial', price: 149000, note: '1–2 profesionales' },
    { id: 'Pro', price: 249000, note: '3–6 profesionales + automatizaciones', rec: true },
    { id: 'Premium', price: 399000, note: 'Ilimitado · multisede' },
  ],
  menu: [
    { id: 'Esencial', price: 249000, note: 'Hasta 15 mesas' },
    { id: 'Pro', price: 399000, note: 'Hasta 30 mesas · reportes', rec: true },
    { id: 'Premium', price: 599000, note: 'Multisede · inventario · domicilios' },
  ],
};

const SELLER_KEY = 'bs-seller';
export function savedSeller(): Seller {
  try {
    const s = JSON.parse(localStorage.getItem(SELLER_KEY) ?? 'null') as Seller | null;
    if (s?.phone) return s;
  } catch {
    /* ignorar */
  }
  return DEFAULT_SELLER;
}
export function saveSeller(s: Seller) {
  try {
    localStorage.setItem(SELLER_KEY, JSON.stringify(s));
  } catch {
    /* ignorar */
  }
}
