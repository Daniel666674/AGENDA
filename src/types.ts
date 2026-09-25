// ─────────────────────────────────────────────────────────────
// Tipos centrales de la agenda
// ─────────────────────────────────────────────────────────────

export type Lang = 'es' | 'en';

export type BusinessType =
  | 'vet'
  | 'nails'
  | 'barber'
  | 'medical'
  | 'dental'
  | 'spa'
  | 'salon'
  | 'fitness'
  | 'generic';

/** Horario de un día. Horas en formato "HH:mm" (24h). */
export interface DayHours {
  open: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

/** 7 elementos: índice 0 = domingo … 6 = sábado */
export type WeekHours = DayHours[];

export interface Theme {
  /** Color principal de la marca */
  accent: string;
  /** Fondo claro "papel" (modo claro) */
  paper: string;
  /** Modo por defecto al abrir el demo */
  mode: 'light' | 'dark';
  /** Fuente de títulos (Google Fonts) */
  fontDisplay: string;
  /** Fuente de texto (Google Fonts) */
  fontBody: string;
  /** Redondeo de esquinas en px */
  radius: number;
}

export interface Business {
  name: string;
  tagline: string;
  type: BusinessType;
  logo?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  currency: string;
  locale: string;
  lang: Lang;
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1;
  slotMinutes: number;
  hours: WeekHours;
  bookingLeadMinutes: number;
  bookingHorizonDays: number;
  reminderTemplate: string;
  theme: Theme;
  preparedFor?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  color: string;
  photo?: string;
  active: boolean;
  /** Horario propio. Si no existe usa el del negocio. */
  hours?: WeekHours;
  /** Servicios que realiza. Vacío = todos. */
  serviceIds: string[];
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  /** Minutos de limpieza/preparación después del servicio */
  buffer: number;
  price: number;
  color: string;
  active: boolean;
  online: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
  pets: Pet[];
  createdAt: string;
}

export type Status = 'pending' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';

export const STATUSES: Status[] = ['pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled'];

export interface Appointment {
  id: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  petId?: string;
  /** Hora local "YYYY-MM-DDTHH:mm" */
  start: string;
  /** Minutos */
  duration: number;
  price: number;
  status: Status;
  notes: string;
  source: 'staff' | 'online' | 'phone' | 'whatsapp';
  paid: boolean;
  seriesId?: string;
  reminded?: boolean;
  createdAt: string;
}

/** Bloqueo de agenda: vacaciones, reunión, comida… staffId vacío = todo el negocio */
export interface TimeBlock {
  id: string;
  staffId: string | null;
  start: string;
  end: string;
  reason: string;
}

export interface WaitlistEntry {
  id: string;
  clientId: string;
  serviceId: string;
  staffId: string | null;
  date: string;
  notes: string;
  createdAt: string;
}

export interface AppState {
  version: number;
  slug: string;
  /** Día (YYYY-MM-DD) en que se generaron los datos demo */
  seededOn: string;
  /** true cuando el usuario ya editó algo (no se regenera el demo) */
  dirty: boolean;
  business: Business;
  staff: Staff[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  blocks: TimeBlock[];
  waitlist: WaitlistEntry[];
  /** Automatizaciones activas (id → encendida). Si falta, se usan los valores por defecto. */
  automations?: Record<string, boolean>;
}

// ─────────────────────────────────────────────────────────────
// Configuración de cada cliente/prospecto (src/clientes/*.ts)
// ─────────────────────────────────────────────────────────────

export interface DemoConfig {
  /** Identificador en la URL: ?c=slug */
  slug: string;
  /** Tipo de negocio: define servicios, equipo, colores y vocabulario por defecto */
  type: BusinessType;
  name: string;
  tagline?: string;
  /** Ruta a /public/logos/archivo.png o URL completa */
  logo?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  instagram?: string;
  lang?: Lang;
  timeFormat?: '12h' | '24h';
  /** Nombre de la persona a la que va dirigido el demo (aparece en la bienvenida) */
  preparedFor?: string;
  theme?: Partial<Theme>;
  hours?: WeekHours;
  staff?: { name: string; role?: string; color?: string; photo?: string }[];
  services?: {
    name: string;
    duration: number;
    price: number;
    category?: string;
    description?: string;
    color?: string;
    buffer?: number;
  }[];
}
