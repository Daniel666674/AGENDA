// ─────────────────────────────────────────────────────────────
// Pedidos por QR en mesa — restaurantes, cafés, bares, comida rápida
// ─────────────────────────────────────────────────────────────
import type { Theme } from '../types';

export type VenueType = 'restaurant' | 'cafe' | 'bar' | 'burger';

export interface Choice {
  id: string;
  name: string;
  price: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  /** true = hay que elegir uno */
  required: boolean;
  /** 1 = selección única; >1 = varias (extras) */
  max: number;
  choices: Choice[];
}

export type ItemTag = 'recomendado' | 'nuevo' | 'picante' | 'vegetariano' | 'para-compartir';

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  photo?: string;
  tags: ItemTag[];
  available: boolean;
  prepMinutes: number;
  options: OptionGroup[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  zone: string;
}

export interface OrderLine {
  id: string;
  itemId: string;
  name: string;
  qty: number;
  /** precio unitario ya con opciones */
  unitPrice: number;
  choices: string[];
  note: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  number: number;
  tableId: string;
  lines: OrderLine[];
  status: OrderStatus;
  /** epoch ms */
  createdAt: number;
  updatedAt: number;
  note: string;
  name: string;
  paid: boolean;
}

export type RequestKind = 'waiter' | 'bill';
export type PayMethod = 'efectivo' | 'tarjeta' | 'nequi' | 'daviplata';

export interface TableRequest {
  id: string;
  tableId: string;
  kind: RequestKind;
  createdAt: number;
  done: boolean;
  pay?: PayMethod;
  tip?: number;
}

export interface Venue {
  name: string;
  tagline: string;
  type: VenueType;
  logo?: string;
  phone: string;
  address: string;
  instagram: string;
  preparedFor?: string;
  wifi?: string;
  theme: Theme;
  /** propina sugerida (Colombia: 10% voluntaria) */
  tipPercent: number;
}

export interface MenuState {
  version: number;
  slug: string;
  seededOn: string;
  dirty: boolean;
  venue: Venue;
  categories: Category[];
  items: MenuItem[];
  tables: Table[];
  orders: Order[];
  requests: TableRequest[];
  nextNumber: number;
  /** genera pedidos de ejemplo cada cierto tiempo para que el demo "se mueva" */
  live: boolean;
}

/** Configuración de cada prospecto (src/restaurantes/*.ts) */
export interface MenuConfig {
  slug: string;
  type: VenueType;
  name: string;
  tagline?: string;
  logo?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  preparedFor?: string;
  wifi?: string;
  tables?: number;
  theme?: Partial<Theme>;
  /** Vendedor al que le llega el "Quiero activarlo" */
  seller?: { name: string; phone: string };
  /** Reemplaza la carta de ejemplo */
  menu?: { category: string; emoji?: string; items: { name: string; price: number; description?: string; emoji?: string; photo?: string }[] }[];
}
