// Genera un estado completo y realista a partir de la configuración del prospecto.
// Las fechas son SIEMPRE relativas a hoy, así el demo siempre se ve vivo.
import type { AppState, Appointment, Client, DemoConfig, Service, Staff, Status } from '../types';
import { addDays, atMinutes, dateKey, minutesOfDay, toLocal } from '../lib/date';
import { busyIntervals, subtract, workingWindows } from '../lib/availability';
import { CURRENCY_LOCALE, PET_SPECIES, PRESETS, SWATCHES, localPrice, pick } from './presets';

export const STATE_VERSION = 3;

function hash(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  };
}

const NAMES = {
  es: {
    f: ['María José', 'Ana Sofía', 'Valentina', 'Fernanda', 'Daniela', 'Regina', 'Camila', 'Andrea', 'Paola', 'Gabriela', 'Lucía', 'Mariana', 'Carolina', 'Natalia', 'Alejandra', 'Isabel', 'Renata', 'Victoria', 'Elena', 'Jimena', 'Patricia', 'Mónica', 'Rocío', 'Adriana', 'Claudia', 'Beatriz'],
    m: ['José Luis', 'Carlos', 'Juan Pablo', 'Miguel Ángel', 'Santiago', 'Sebastián', 'Emiliano', 'Rodrigo', 'Javier', 'Luis Fernando', 'Eduardo', 'Ricardo', 'Pablo', 'Héctor', 'Arturo', 'Óscar', 'Raúl', 'Manuel', 'Francisco', 'Gustavo', 'Alberto', 'Mauricio'],
    last: ['García', 'Hernández', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Vargas', 'Castro', 'Ortega', 'Romero', 'Mendoza', 'Silva', 'Rojas', 'Herrera', 'Medina', 'Aguirre', 'Cabrera'],
  },
  en: {
    f: ['Emma', 'Olivia', 'Ava', 'Sophia', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Grace', 'Chloe', 'Lily', 'Hannah', 'Zoe', 'Nora', 'Madison', 'Aria'],
    m: ['Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Mason', 'Ethan', 'Jack', 'Daniel', 'Logan', 'Owen', 'Caleb', 'Ryan', 'Nathan', 'Leo', 'Adam'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Martin', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Young', 'Allen', 'King'],
  },
};

const NOTES = {
  es: ['Prefiere mensajes por WhatsApp', 'Alergia a la penicilina', 'Llega 10 min antes siempre', 'Pidió recordatorio un día antes', 'Le gusta la última cita de la tarde', 'Paga con tarjeta', 'Referido por Instagram', 'Cliente desde la apertura', ''],
  en: ['Prefers WhatsApp messages', 'Penicillin allergy', 'Always arrives 10 min early', 'Asked for a reminder the day before', 'Likes the last slot of the day', 'Pays by card', 'Referred via Instagram', 'Client since opening day', ''],
};

const APPT_NOTES = {
  es: ['Primera vez', 'Viene recomendada', 'Traer estudios previos', 'Pidió con su profesional de siempre', 'Confirmó por WhatsApp', ''],
  en: ['First visit', 'Referred by a friend', 'Bring previous results', 'Asked for their usual pro', 'Confirmed via WhatsApp', ''],
};

const TAGS = { es: ['VIP', 'Frecuente', 'Nuevo', 'Referido'], en: ['VIP', 'Regular', 'New', 'Referral'] };

const DEFAULT_CURRENCY = { es: 'MXN', en: 'USD' } as const;
const DEFAULT_LOCALE = { es: 'es-MX', en: 'en-US' } as const;

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildState(cfg: DemoConfig, today: Date = new Date()): AppState {
  const preset = PRESETS[cfg.type] ?? PRESETS.generic;
  const lang = cfg.lang ?? 'es';
  const currency = cfg.currency ?? DEFAULT_CURRENCY[lang];
  const r = rng(hash(cfg.slug + dateKey(today)));
  let idn = 0;
  const id = (p: string) => `${p}${(++idn).toString(36)}`;

  const services: Service[] = (cfg.services
    ? cfg.services.map((s, i) => ({
        id: id('svc'),
        name: s.name,
        category: s.category ?? pick(preset.services[0].category, lang),
        description: s.description ?? '',
        duration: s.duration,
        buffer: s.buffer ?? 0,
        price: s.price,
        color: s.color ?? SWATCHES[i % SWATCHES.length],
        active: true,
        online: true,
      }))
    : preset.services.map((s, i) => ({
        id: id('svc'),
        name: pick(s.name, lang),
        category: pick(s.category, lang),
        description: s.description ? pick(s.description, lang) : '',
        duration: s.duration,
        buffer: s.buffer ?? 0,
        price: localPrice(s.usd, currency),
        color: SWATCHES[i % SWATCHES.length],
        active: true,
        online: true,
      })));

  const staffSrc: NonNullable<DemoConfig['staff']> = cfg.staff ?? preset.staff.map((s) => ({ name: s.name, role: pick(s.role, lang) }));
  const staff: Staff[] = staffSrc.map((s, i) => ({
    id: id('stf'),
    name: s.name,
    role: s.role ?? pick(preset.staffNoun, lang),
    color: s.color ?? SWATCHES[(i + 4) % SWATCHES.length],
    photo: s.photo,
    active: true,
    serviceIds: [],
  }));

  // Veterinaria: la estética canina sólo hace baño y corte
  if (cfg.type === 'vet' && !cfg.staff && !cfg.services && staff[2]) staff[2].serviceIds = [services[3].id];

  const business: AppState['business'] = {
    name: cfg.name,
    tagline: cfg.tagline ?? pick(preset.tagline, lang),
    type: cfg.type,
    logo: cfg.logo,
    phone: cfg.phone ?? '',
    whatsapp: cfg.whatsapp ?? cfg.phone ?? '',
    email: cfg.email ?? '',
    address: cfg.address ?? '',
    instagram: cfg.instagram ?? '',
    currency,
    locale: cfg.locale ?? (lang === 'es' || currency === 'USD' ? CURRENCY_LOCALE[currency] : undefined) ?? DEFAULT_LOCALE[lang],
    lang,
    timeFormat: cfg.timeFormat ?? '12h',
    weekStartsOn: lang === 'en' ? 0 : 1,
    slotMinutes: 15,
    hours: cfg.hours ?? preset.hours,
    bookingLeadMinutes: 60,
    bookingHorizonDays: 45,
    reminderTemplate:
      lang === 'es'
        ? 'Hola {cliente} 👋 Te recordamos tu cita de {servicio} el {fecha} a las {hora} en {negocio}. Responde SÍ para confirmar o escríbenos si necesitas cambiarla. ¡Te esperamos!'
        : 'Hi {cliente} 👋 This is a reminder of your {servicio} appointment on {fecha} at {hora} at {negocio}. Reply YES to confirm or message us to reschedule. See you soon!',
    theme: { ...preset.theme, ...cfg.theme },
    preparedFor: cfg.preparedFor,
  };

  // ── Clientes ──────────────────────────────────────────────
  const names = NAMES[lang];
  const femaleBias = ['nails', 'salon', 'spa'].includes(cfg.type) ? 0.85 : cfg.type === 'barber' ? 0.08 : 0.5;
  const cc = (cfg.phone ?? '').trim().startsWith('+') ? (cfg.phone ?? '').trim().split(/\s+/)[0] + ' ' : '';
  const used = new Set<string>();
  const clients: Client[] = [];
  const createdBase = addDays(today, -400);
  for (let i = 0; i < 150; i++) {
    let name = '';
    for (let tries = 0; tries < 20; tries++) {
      const first = r.chance(femaleBias) ? r.pick(names.f) : r.pick(names.m);
      name = `${first} ${r.pick(names.last)}`;
      if (!used.has(name)) break;
    }
    used.add(name);
    const pets =
      preset.usesPets
        ? Array.from({ length: r.chance(0.25) ? 2 : 1 }, () => {
            const sp = r.chance(0.7) ? PET_SPECIES[lang][0] : PET_SPECIES[lang][1];
            return { id: id('pet'), name: r.pick(sp.names), species: sp.species, breed: r.pick(sp.breeds) };
          })
        : [];
    const email = slugify(name).replace(/-/g, '.').split('.').slice(0, 2).join('.') + r.int(1, 99) + '@' + r.pick(['gmail.com', 'hotmail.com', 'outlook.com', 'icloud.com']);
    clients.push({
      id: id('cli'),
      name,
      phone: `${cc}${r.int(20, 99)} ${r.int(1000, 9999)} ${r.int(1000, 9999)}`,
      email,
      notes: r.chance(0.45) ? r.pick(NOTES[lang]) : '',
      tags: r.chance(0.35) ? [r.pick(TAGS[lang])] : [],
      pets,
      createdAt: toLocal(addDays(createdBase, r.int(0, 390))),
    });
  }
  clients.sort((a, b) => a.name.localeCompare(b.name));
  // Clientes "frecuentes" aparecen más
  const weightedClients = clients.flatMap((c, i) => (i % 7 === 0 ? [c, c, c] : i % 3 === 0 ? [c, c] : [c]));

  const state: AppState = {
    version: STATE_VERSION,
    slug: cfg.slug,
    seededOn: dateKey(today),
    dirty: false,
    business,
    staff,
    services,
    clients,
    appointments: [],
    blocks: [],
    waitlist: [],
  };

  // Un bloqueo realista: capacitación de un profesional en unos días
  if (staff.length > 1) {
    const d = dateKey(addDays(today, 3 + r.int(0, 3)));
    state.blocks.push({ id: id('blk'), staffId: staff[staff.length - 1].id, start: `${d}T15:00`, end: `${d}T17:00`, reason: lang === 'es' ? 'Capacitación' : 'Training' });
  }

  // ── Citas ─────────────────────────────────────────────────
  const nowMin = minutesOfDay(today);
  const todayKey = dateKey(today);
  const svcWeights = services.flatMap((s, i) => Array(Math.max(1, 5 - Math.floor(i / 2))).fill(s) as Service[]);
  const appts: Appointment[] = [];

  for (let offset = -42; offset <= 24; offset++) {
    const dayDate = addDays(today, offset);
    const day = dateKey(dayDate);
    const seenToday = new Set<string>();
    const density = offset < 0 ? 0.72 : offset === 0 ? 0.82 : Math.max(0.1, 0.64 - offset * 0.03);
    for (const st of staff) {
      const windows = subtract(workingWindows(state, st, day), busyIntervals(state, st.id, day));
      for (const [ws, we] of windows) {
        let t = ws;
        while (t < we) {
          if (!r.chance(density)) {
            t += r.pick([15, 30, 30, 45, 60]);
            continue;
          }
          const svcPool = svcWeights.filter((s) => st.serviceIds.length === 0 || st.serviceIds.includes(s.id));
          const svc = r.pick(svcPool);
          if (t + svc.duration > we) {
            t += 15;
            continue;
          }
          let client = r.pick(weightedClients);
          for (let k = 0; k < 8 && seenToday.has(client.id); k++) client = r.pick(weightedClients);
          seenToday.add(client.id);
          const end = t + svc.duration;
          let status: Status;
          if (day < todayKey || (day === todayKey && end <= nowMin)) {
            const x = r.next();
            status = x < 0.84 ? 'completed' : x < 0.91 ? 'no_show' : 'cancelled';
          } else if (day === todayKey && t <= nowMin) {
            status = 'arrived';
          } else {
            status = r.chance(offset <= 1 ? 0.75 : 0.5) ? 'confirmed' : 'pending';
            if (r.chance(0.04)) status = 'cancelled';
          }
          const pet = client.pets.length ? r.pick(client.pets) : undefined;
          appts.push({
            id: id('apt'),
            clientId: client.id,
            staffId: st.id,
            serviceId: svc.id,
            petId: pet?.id,
            start: atMinutes(day, t),
            duration: svc.duration,
            price: svc.price,
            status,
            notes: r.chance(0.25) ? r.pick(APPT_NOTES[lang]) : '',
            source: r.pick(['staff', 'online', 'online', 'whatsapp', 'phone'] as const),
            paid: status === 'completed' ? r.chance(0.96) : false,
            reminded: day > todayKey ? r.chance(0.4) : true,
            createdAt: toLocal(addDays(dayDate, -r.int(1, 14))),
          });
          t = end + svc.buffer;
          t = Math.ceil(t / 15) * 15;
        }
      }
    }
  }
  state.appointments = appts;

  // Lista de espera
  for (let i = 0; i < 3; i++) {
    const c = r.pick(clients);
    state.waitlist.push({
      id: id('wl'),
      clientId: c.id,
      serviceId: r.pick(services).id,
      staffId: r.chance(0.5) ? r.pick(staff).id : null,
      date: dateKey(addDays(today, r.int(1, 6))),
      notes: lang === 'es' ? r.pick(['Cualquier hora en la mañana', 'Después de las 5 pm', 'Avisar si se libera algo']) : r.pick(['Any morning slot', 'After 5 pm', 'Let me know if anything opens up']),
      createdAt: toLocal(addDays(today, -r.int(0, 3))),
    });
  }
  return state;
}
