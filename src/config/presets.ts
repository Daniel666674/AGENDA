// Plantillas por tipo de negocio: vocabulario, colores, tipografías, servicios y equipo.
// Los precios están en USD y se convierten a la moneda del demo con `localPrice`.
import type { BusinessType, Lang, Theme, WeekHours } from '../types';

type Bi = [es: string, en: string];

export interface PresetService {
  name: Bi;
  category: Bi;
  duration: number;
  usd: number;
  buffer?: number;
  description?: Bi;
}

export interface Preset {
  label: Bi;
  emoji: string;
  client: Bi;
  clients: Bi;
  staffNoun: Bi;
  usesPets: boolean;
  tagline: Bi;
  theme: Theme;
  hours: WeekHours;
  staff: { name: string; role: Bi }[];
  services: PresetService[];
}

const day = (start: string, end: string, breakStart?: string, breakEnd?: string) => ({ open: true, start, end, breakStart, breakEnd });
const closed = { open: false, start: '09:00', end: '18:00' };

const WEEK = (weekday: ReturnType<typeof day>, sat: typeof closed | ReturnType<typeof day>, sun: typeof closed | ReturnType<typeof day> = closed): WeekHours => [
  sun, weekday, weekday, weekday, weekday, weekday, sat,
];

export const PRESETS: Record<BusinessType, Preset> = {
  vet: {
    label: ['Clínica veterinaria', 'Veterinary clinic'],
    emoji: '🐾',
    client: ['Tutor', 'Owner'],
    clients: ['Tutores', 'Owners'],
    staffNoun: ['Veterinario', 'Vet'],
    usesPets: true,
    tagline: ['Cuidamos a quien más quieres', 'Caring for the ones you love'],
    theme: { accent: '#2f7a5c', paper: '#f5f2ea', mode: 'light', fontDisplay: 'Fraunces', fontBody: 'Nunito Sans', radius: 14 },
    hours: WEEK(day('09:00', '19:00', '14:00', '15:00'), day('09:00', '14:00')),
    staff: [
      { name: 'Dra. Mariana Ríos', role: ['Medicina general', 'General practice'] },
      { name: 'Dr. Tomás Aguilar', role: ['Cirugía', 'Surgery'] },
      { name: 'Lucía Paredes', role: ['Estética canina', 'Grooming'] },
    ],
    services: [
      { name: ['Consulta general', 'General check-up'], category: ['Consultas', 'Consults'], duration: 30, usd: 30 },
      { name: ['Vacunación', 'Vaccination'], category: ['Prevención', 'Prevention'], duration: 20, usd: 25 },
      { name: ['Desparasitación', 'Deworming'], category: ['Prevención', 'Prevention'], duration: 15, usd: 15 },
      { name: ['Baño y corte', 'Bath & trim'], category: ['Estética', 'Grooming'], duration: 90, usd: 40, buffer: 15 },
      { name: ['Limpieza dental', 'Dental cleaning'], category: ['Procedimientos', 'Procedures'], duration: 60, usd: 90, buffer: 15 },
      { name: ['Esterilización', 'Spay / neuter'], category: ['Cirugía', 'Surgery'], duration: 120, usd: 180, buffer: 30 },
      { name: ['Ultrasonido', 'Ultrasound'], category: ['Diagnóstico', 'Diagnostics'], duration: 30, usd: 45 },
      { name: ['Control post-operatorio', 'Post-op follow-up'], category: ['Consultas', 'Consults'], duration: 20, usd: 0 },
    ],
  },
  nails: {
    label: ['Nail spa', 'Nail spa'],
    emoji: '💅',
    client: ['Clienta', 'Client'],
    clients: ['Clientas', 'Clients'],
    staffNoun: ['Manicurista', 'Nail artist'],
    usesPets: false,
    tagline: ['Tus manos, nuestra obra', 'Your hands, our art'],
    theme: { accent: '#b8456f', paper: '#fbf4f1', mode: 'light', fontDisplay: 'Cormorant Garamond', fontBody: 'Jost', radius: 18 },
    hours: WEEK(day('10:00', '20:00'), day('09:00', '18:00'), day('10:00', '15:00')),
    staff: [
      { name: 'Valeria Soto', role: ['Nail artist senior', 'Senior nail artist'] },
      { name: 'Camila Duarte', role: ['Acrílico y gel', 'Acrylic & gel'] },
      { name: 'Renata Flores', role: ['Pedicure spa', 'Spa pedicure'] },
      { name: 'Ximena Lara', role: ['Diseño y nail art', 'Nail art & design'] },
    ],
    services: [
      { name: ['Manicure clásico', 'Classic manicure'], category: ['Manos', 'Hands'], duration: 45, usd: 18 },
      { name: ['Gelish en manos', 'Gel polish'], category: ['Manos', 'Hands'], duration: 60, usd: 25 },
      { name: ['Uñas acrílicas', 'Acrylic set'], category: ['Extensiones', 'Extensions'], duration: 120, usd: 45, buffer: 10 },
      { name: ['Retoque acrílico', 'Acrylic fill'], category: ['Extensiones', 'Extensions'], duration: 75, usd: 30 },
      { name: ['Pedicure spa', 'Spa pedicure'], category: ['Pies', 'Feet'], duration: 60, usd: 30, buffer: 10 },
      { name: ['Nail art (por diseño)', 'Nail art (per design)'], category: ['Diseño', 'Design'], duration: 30, usd: 12 },
      { name: ['Retiro de gel', 'Gel removal'], category: ['Manos', 'Hands'], duration: 20, usd: 8 },
      { name: ['Mani + Pedi deluxe', 'Deluxe mani + pedi'], category: ['Paquetes', 'Packages'], duration: 120, usd: 55, buffer: 10 },
    ],
  },
  barber: {
    label: ['Barbería', 'Barbershop'],
    emoji: '💈',
    client: ['Cliente', 'Client'],
    clients: ['Clientes', 'Clients'],
    staffNoun: ['Barbero', 'Barber'],
    usesPets: false,
    tagline: ['Estilo con oficio', 'Crafted style'],
    theme: { accent: '#c8a063', paper: '#f3eee5', mode: 'dark', fontDisplay: 'Big Shoulders Display', fontBody: 'Inter Tight', radius: 6 },
    hours: WEEK(day('10:00', '21:00'), day('09:00', '21:00'), day('10:00', '16:00')),
    staff: [
      { name: 'Andrés "Flaco" Mena', role: ['Master barber', 'Master barber'] },
      { name: 'Diego Salazar', role: ['Fades y diseños', 'Fades & designs'] },
      { name: 'Iván Cordero', role: ['Barba y afeitado', 'Beard & shave'] },
      { name: 'Samuel Ortiz', role: ['Barbero', 'Barber'] },
    ],
    services: [
      { name: ['Corte clásico', 'Classic cut'], category: ['Cortes', 'Cuts'], duration: 30, usd: 15 },
      { name: ['Fade / degradado', 'Skin fade'], category: ['Cortes', 'Cuts'], duration: 45, usd: 20 },
      { name: ['Corte + barba', 'Cut + beard'], category: ['Combos', 'Combos'], duration: 60, usd: 28 },
      { name: ['Perfilado de barba', 'Beard trim'], category: ['Barba', 'Beard'], duration: 20, usd: 10 },
      { name: ['Afeitado con toalla caliente', 'Hot towel shave'], category: ['Barba', 'Beard'], duration: 40, usd: 22 },
      { name: ['Corte niño', 'Kids cut'], category: ['Cortes', 'Cuts'], duration: 30, usd: 12 },
      { name: ['Diseño / freestyle', 'Hair design'], category: ['Extras', 'Extras'], duration: 15, usd: 8 },
      { name: ['Ritual completo', 'The full ritual'], category: ['Combos', 'Combos'], duration: 90, usd: 40, buffer: 5 },
    ],
  },
  medical: {
    label: ['Consultorio médico', 'Medical practice'],
    emoji: '🩺',
    client: ['Paciente', 'Patient'],
    clients: ['Pacientes', 'Patients'],
    staffNoun: ['Médico', 'Doctor'],
    usesPets: false,
    tagline: ['Atención cercana, medicina de confianza', 'Personal care, trusted medicine'],
    theme: { accent: '#2563a8', paper: '#f3f6f9', mode: 'light', fontDisplay: 'Instrument Serif', fontBody: 'Plus Jakarta Sans', radius: 12 },
    hours: WEEK(day('08:00', '19:00', '13:30', '15:00'), day('09:00', '13:00')),
    staff: [
      { name: 'Dr. Alejandro Vidal', role: ['Medicina interna', 'Internal medicine'] },
      { name: 'Dra. Paula Méndez', role: ['Pediatría', 'Pediatrics'] },
      { name: 'Dra. Sofía Navarro', role: ['Nutrición clínica', 'Clinical nutrition'] },
    ],
    services: [
      { name: ['Consulta de primera vez', 'New patient visit'], category: ['Consultas', 'Visits'], duration: 45, usd: 50 },
      { name: ['Consulta subsecuente', 'Follow-up visit'], category: ['Consultas', 'Visits'], duration: 30, usd: 40 },
      { name: ['Consulta pediátrica', 'Pediatric visit'], category: ['Consultas', 'Visits'], duration: 30, usd: 45 },
      { name: ['Plan nutricional', 'Nutrition plan'], category: ['Nutrición', 'Nutrition'], duration: 60, usd: 55 },
      { name: ['Certificado médico', 'Medical certificate'], category: ['Trámites', 'Paperwork'], duration: 15, usd: 20 },
      { name: ['Revisión de estudios', 'Lab results review'], category: ['Consultas', 'Visits'], duration: 20, usd: 25 },
      { name: ['Teleconsulta', 'Telehealth visit'], category: ['En línea', 'Online'], duration: 30, usd: 35 },
    ],
  },
  dental: {
    label: ['Clínica dental', 'Dental clinic'],
    emoji: '🦷',
    client: ['Paciente', 'Patient'],
    clients: ['Pacientes', 'Patients'],
    staffNoun: ['Especialista', 'Specialist'],
    usesPets: false,
    tagline: ['Sonrisas que se notan', 'Smiles worth showing'],
    theme: { accent: '#0f8b8d', paper: '#f1f7f6', mode: 'light', fontDisplay: 'Outfit', fontBody: 'Outfit', radius: 16 },
    hours: WEEK(day('09:00', '19:00', '14:00', '15:00'), day('09:00', '14:00')),
    staff: [
      { name: 'Dra. Fernanda Olmos', role: ['Ortodoncia', 'Orthodontics'] },
      { name: 'Dr. Ricardo Beltrán', role: ['Odontología general', 'General dentistry'] },
      { name: 'Dra. Andrea Cruz', role: ['Endodoncia', 'Endodontics'] },
    ],
    services: [
      { name: ['Valoración inicial', 'Initial assessment'], category: ['Diagnóstico', 'Diagnosis'], duration: 30, usd: 25 },
      { name: ['Limpieza dental', 'Dental cleaning'], category: ['Prevención', 'Prevention'], duration: 45, usd: 50, buffer: 10 },
      { name: ['Ajuste de brackets', 'Braces adjustment'], category: ['Ortodoncia', 'Orthodontics'], duration: 30, usd: 40 },
      { name: ['Colocación de brackets', 'Braces placement'], category: ['Ortodoncia', 'Orthodontics'], duration: 90, usd: 600, buffer: 15 },
      { name: ['Resina', 'Filling'], category: ['Restauración', 'Restorative'], duration: 45, usd: 60 },
      { name: ['Endodoncia', 'Root canal'], category: ['Endodoncia', 'Endodontics'], duration: 90, usd: 250, buffer: 15 },
      { name: ['Blanqueamiento', 'Whitening'], category: ['Estética', 'Cosmetic'], duration: 60, usd: 180 },
      { name: ['Urgencia dental', 'Dental emergency'], category: ['Urgencias', 'Emergency'], duration: 30, usd: 45 },
    ],
  },
  spa: {
    label: ['Spa y bienestar', 'Spa & wellness'],
    emoji: '🌿',
    client: ['Cliente', 'Guest'],
    clients: ['Clientes', 'Guests'],
    staffNoun: ['Terapeuta', 'Therapist'],
    usesPets: false,
    tagline: ['Un respiro para ti', 'Time to breathe'],
    theme: { accent: '#8a6a45', paper: '#f6f1ea', mode: 'light', fontDisplay: 'Cormorant Garamond', fontBody: 'Manrope', radius: 20 },
    hours: WEEK(day('09:00', '20:00'), day('09:00', '19:00'), day('10:00', '16:00')),
    staff: [
      { name: 'Isabela Moreno', role: ['Masoterapia', 'Massage therapy'] },
      { name: 'Natalia Guerra', role: ['Faciales', 'Facials'] },
      { name: 'Emilio Rangel', role: ['Masaje deportivo', 'Sports massage'] },
    ],
    services: [
      { name: ['Masaje relajante 60′', 'Relaxing massage 60′'], category: ['Masajes', 'Massage'], duration: 60, usd: 55, buffer: 15 },
      { name: ['Masaje de tejido profundo', 'Deep tissue massage'], category: ['Masajes', 'Massage'], duration: 75, usd: 70, buffer: 15 },
      { name: ['Piedras calientes', 'Hot stones'], category: ['Masajes', 'Massage'], duration: 90, usd: 85, buffer: 15 },
      { name: ['Facial hidratante', 'Hydrating facial'], category: ['Faciales', 'Facials'], duration: 60, usd: 50, buffer: 10 },
      { name: ['Limpieza facial profunda', 'Deep cleansing facial'], category: ['Faciales', 'Facials'], duration: 75, usd: 60, buffer: 10 },
      { name: ['Ritual para parejas', 'Couples ritual'], category: ['Rituales', 'Rituals'], duration: 120, usd: 160, buffer: 20 },
    ],
  },
  salon: {
    label: ['Salón de belleza', 'Hair salon'],
    emoji: '✂️',
    client: ['Clienta', 'Client'],
    clients: ['Clientas', 'Clients'],
    staffNoun: ['Estilista', 'Stylist'],
    usesPets: false,
    tagline: ['Color, corte y actitud', 'Color, cut & attitude'],
    theme: { accent: '#7d3c62', paper: '#f7f2f3', mode: 'light', fontDisplay: 'DM Serif Display', fontBody: 'DM Sans', radius: 14 },
    hours: WEEK(day('10:00', '20:00'), day('09:00', '19:00')),
    staff: [
      { name: 'Gabriela Núñez', role: ['Colorista', 'Colorist'] },
      { name: 'Mateo Villalobos', role: ['Corte y peinado', 'Cut & style'] },
      { name: 'Daniela Ibarra', role: ['Tratamientos', 'Treatments'] },
    ],
    services: [
      { name: ['Corte de dama', 'Women’s cut'], category: ['Corte', 'Cut'], duration: 60, usd: 35 },
      { name: ['Tinte completo', 'Full color'], category: ['Color', 'Color'], duration: 120, usd: 80, buffer: 10 },
      { name: ['Balayage', 'Balayage'], category: ['Color', 'Color'], duration: 180, usd: 160, buffer: 15 },
      { name: ['Peinado de evento', 'Event styling'], category: ['Peinado', 'Styling'], duration: 60, usd: 45 },
      { name: ['Keratina', 'Keratin treatment'], category: ['Tratamientos', 'Treatments'], duration: 150, usd: 120, buffer: 15 },
      { name: ['Brushing', 'Blowout'], category: ['Peinado', 'Styling'], duration: 45, usd: 25 },
    ],
  },
  fitness: {
    label: ['Estudio fitness', 'Fitness studio'],
    emoji: '🏋️',
    client: ['Alumno', 'Member'],
    clients: ['Alumnos', 'Members'],
    staffNoun: ['Coach', 'Coach'],
    usesPets: false,
    tagline: ['Entrena con propósito', 'Train with purpose'],
    theme: { accent: '#e2552b', paper: '#f4f3ef', mode: 'light', fontDisplay: 'Archivo Black', fontBody: 'Archivo', radius: 8 },
    hours: WEEK(day('06:00', '21:00'), day('08:00', '14:00')),
    staff: [
      { name: 'Coach Bruno Lozano', role: ['Fuerza', 'Strength'] },
      { name: 'Coach Mariel Sáenz', role: ['Pilates', 'Pilates'] },
      { name: 'Coach Tadeo Ruiz', role: ['Funcional', 'Functional'] },
    ],
    services: [
      { name: ['Entrenamiento personal', 'Personal training'], category: ['1 a 1', '1-on-1'], duration: 60, usd: 35 },
      { name: ['Pilates reformer', 'Reformer pilates'], category: ['Pilates', 'Pilates'], duration: 50, usd: 25, buffer: 10 },
      { name: ['Evaluación física', 'Fitness assessment'], category: ['Evaluación', 'Assessment'], duration: 45, usd: 30 },
      { name: ['Sesión de movilidad', 'Mobility session'], category: ['1 a 1', '1-on-1'], duration: 45, usd: 25 },
      { name: ['Plan de nutrición', 'Nutrition coaching'], category: ['Nutrición', 'Nutrition'], duration: 45, usd: 40 },
    ],
  },
  generic: {
    label: ['Negocio de servicios', 'Service business'],
    emoji: '📅',
    client: ['Cliente', 'Client'],
    clients: ['Clientes', 'Clients'],
    staffNoun: ['Profesional', 'Team member'],
    usesPets: false,
    tagline: ['Reserva tu cita en segundos', 'Book in seconds'],
    theme: { accent: '#3f51b5', paper: '#f4f4f1', mode: 'light', fontDisplay: 'Manrope', fontBody: 'Manrope', radius: 12 },
    hours: WEEK(day('09:00', '18:00', '14:00', '15:00'), day('09:00', '13:00')),
    staff: [
      { name: 'Laura Castillo', role: ['Especialista', 'Specialist'] },
      { name: 'Jorge Medina', role: ['Especialista', 'Specialist'] },
    ],
    services: [
      { name: ['Cita estándar', 'Standard appointment'], category: ['General', 'General'], duration: 30, usd: 30 },
      { name: ['Cita extendida', 'Extended appointment'], category: ['General', 'General'], duration: 60, usd: 55 },
      { name: ['Primera visita', 'First visit'], category: ['General', 'General'], duration: 45, usd: 40 },
    ],
  },
};


/** Paleta categórica validada (daltonismo / contraste) para servicios y equipo */
export const SWATCHES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

const RATES: Record<string, number> = {
  USD: 1, MXN: 18, COP: 4000, EUR: 0.92, ARS: 1000, CLP: 950, PEN: 3.7, GTQ: 7.8, DOP: 60, CRC: 510, GBP: 0.79, CAD: 1.36, BOB: 6.9, UYU: 40, PYG: 7500, HNL: 25, NIO: 36.7,
};

/** Convierte un precio base en USD a un precio "bonito" en la moneda local */
export function localPrice(usd: number, currency: string): number {
  const rate = RATES[currency] ?? 1;
  const v = usd * rate;
  if (v === 0) return 0;
  const step = v >= 100000 ? 5000 : v >= 10000 ? 1000 : v >= 1000 ? 50 : v >= 100 ? 10 : v >= 20 ? 5 : 1;
  return Math.max(step, Math.round(v / step) * step);
}

export const pick = (bi: Bi, lang: Lang) => (lang === 'es' ? bi[0] : bi[1]);

export const PET_SPECIES: Record<Lang, { species: string; breeds: string[]; names: string[] }[]> = {
  es: [
    { species: 'Perro', breeds: ['Labrador', 'French poodle', 'Schnauzer', 'Golden retriever', 'Chihuahua', 'Mestizo', 'Pug', 'Border collie', 'Husky'], names: ['Rocky', 'Luna', 'Max', 'Canela', 'Toby', 'Nala', 'Bruno', 'Coco', 'Kira', 'Firulais', 'Lola', 'Zeus'] },
    { species: 'Gato', breeds: ['Doméstico', 'Siamés', 'Persa', 'Maine coon', 'Bengalí'], names: ['Michi', 'Mishka', 'Garfield', 'Nube', 'Salem', 'Pelusa', 'Tigre', 'Olivia'] },
  ],
  en: [
    { species: 'Dog', breeds: ['Labrador', 'Poodle', 'Schnauzer', 'Golden retriever', 'Chihuahua', 'Mixed', 'Pug', 'Border collie', 'Husky'], names: ['Rocky', 'Luna', 'Max', 'Bella', 'Toby', 'Daisy', 'Bruno', 'Coco', 'Cooper', 'Buddy', 'Lola', 'Zeus'] },
    { species: 'Cat', breeds: ['Domestic', 'Siamese', 'Persian', 'Maine coon', 'Bengal'], names: ['Milo', 'Cleo', 'Garfield', 'Oliver', 'Salem', 'Simba', 'Tiger', 'Olivia'] },
  ],
};

/** Formato regional por moneda (separadores y símbolo correctos) */
export const CURRENCY_LOCALE: Record<string, string> = {
  MXN: 'es-MX', COP: 'es-CO', ARS: 'es-AR', CLP: 'es-CL', PEN: 'es-PE', GTQ: 'es-GT', DOP: 'es-DO', CRC: 'es-CR', EUR: 'es-ES', BOB: 'es-BO', UYU: 'es-UY', PYG: 'es-PY', HNL: 'es-HN', NIO: 'es-NI', USD: 'en-US', GBP: 'en-GB', CAD: 'en-CA',
};
