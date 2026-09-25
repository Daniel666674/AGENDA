// Catálogo de automatizaciones (lo que el demo "vende"). Textos bilingües [es, en].
import type { BusinessType } from '../types';
import type { IconName } from '../components/Icon';

type Bi = [string, string];

export type Stage = 'fill' | 'noshow' | 'day' | 'after' | 'loyalty';
export type Impact = 'noshow' | 'waitlist' | 'rebook' | 'winback' | 'slow' | 'reviews' | 'hours' | 'loyalty' | 'none';

export interface Automation {
  id: string;
  stage: Stage;
  icon: IconName;
  title: Bi;
  desc: Bi;
  trigger: Bi;
  /** Mensaje al cliente. null = notificación interna (va al dueño/equipo) */
  message: Bi;
  internal?: boolean;
  impact: Impact;
  defaultOn: boolean;
  /** Sólo aplica a ciertos giros */
  only?: BusinessType[];
}

export const STAGES: { id: Stage; title: Bi; sub: Bi }[] = [
  { id: 'fill', title: ['Llenar la agenda', 'Fill the calendar'], sub: ['Que los clientes vuelvan y los huecos se ocupen solos', 'Bring clients back and fill gaps automatically'] },
  { id: 'noshow', title: ['Cero inasistencias', 'Zero no-shows'], sub: ['Recordar, confirmar y preparar a cada cliente', 'Remind, confirm and prepare every client'] },
  { id: 'day', title: ['El día de la cita', 'On the day'], sub: ['Menos llamadas, más control del día', 'Fewer calls, more control of the day'] },
  { id: 'after', title: ['Después de la cita', 'After the visit'], sub: ['Reseñas, seguimiento y cuidados', 'Reviews, follow-ups and aftercare'] },
  { id: 'loyalty', title: ['Lealtad y negocio', 'Loyalty & business'], sub: ['Premiar a los mejores y medir todo', 'Reward the best and measure everything'] },
];

export const AUTOMATIONS: Automation[] = [
  // ── Llenar la agenda
  {
    id: 'rebook', stage: 'fill', icon: 'repeat', impact: 'rebook', defaultOn: true,
    title: ['Recordatorio para volver', 'Rebooking reminder'],
    desc: ['Cuando se cumple el tiempo ideal entre visitas, invita al cliente a reservar de nuevo con su profesional de siempre.', 'When the ideal time between visits is up, invites the client to book again with their usual pro.'],
    trigger: ['{intervalo} después de su última visita', '{intervalo} after last visit'],
    message: ['Hola {cliente} 👋 Ya toca tu {servicio} en {negocio}. {profesional} tiene espacio esta semana, reserva en 10 segundos: {link}', 'Hi {cliente} 👋 It’s time for your {servicio} at {negocio}. {profesional} has openings this week, book in 10 seconds: {link}'],
  },
  {
    id: 'waitlist', stage: 'fill', icon: 'wait', impact: 'waitlist', defaultOn: true,
    title: ['Lista de espera automática', 'Automatic waitlist'],
    desc: ['Si alguien cancela, el espacio se ofrece a la lista de espera. El primero que responde se queda con la cita.', 'When someone cancels, the slot is offered to the waitlist. First to reply gets it.'],
    trigger: ['Al cancelarse una cita', 'When an appointment is cancelled'],
    message: ['¡Buenas noticias, {cliente}! Se liberó un espacio para {servicio} el {fecha} a las {hora}. Responde SÍ en los próximos 30 min para apartarlo.', 'Good news, {cliente}! A {servicio} slot opened on {fecha} at {hora}. Reply YES within 30 min to grab it.'],
  },
  {
    id: 'winback', stage: 'fill', icon: 'users', impact: 'winback', defaultOn: false,
    title: ['Recuperar clientes inactivos', 'Win back inactive clients'],
    desc: ['A quien no ha vuelto en 60 días le llega un mensaje personal (con un detalle opcional).', 'Clients who haven’t returned in 60 days get a personal message (with an optional perk).'],
    trigger: ['60 días sin visitas', '60 days without a visit'],
    message: ['{cliente}, ¡te extrañamos en {negocio}! 💛 Esta semana tu próxima cita tiene 10% de descuento: {link}', '{cliente}, we miss you at {negocio}! 💛 Your next visit this week is 10% off: {link}'],
  },
  {
    id: 'slow', stage: 'fill', icon: 'calendar', impact: 'slow', defaultOn: false,
    title: ['Llenar días flojos', 'Fill slow days'],
    desc: ['Si mañana está por debajo del 50% de ocupación, avisa a tus clientes frecuentes que hay lugares.', 'If tomorrow is under 50% booked, tells your regulars there are openings.'],
    trigger: ['Ocupación de mañana < 50%', 'Tomorrow’s occupancy < 50%'],
    message: ['Hola {cliente}, mañana tenemos lugares libres en {negocio} ✨ ¿Te apartamos uno? {link}', 'Hi {cliente}, we have openings tomorrow at {negocio} ✨ Want one? {link}'],
  },
  {
    id: 'booked', stage: 'fill', icon: 'check', impact: 'none', defaultOn: true,
    title: ['Confirmación al reservar', 'Booking confirmation'],
    desc: ['En cuanto alguien reserva recibe fecha, hora, dirección y ubicación en el mapa.', 'As soon as someone books they get date, time, address and a map pin.'],
    trigger: ['Al crear una cita', 'When a booking is made'],
    message: ['¡Listo, {cliente}! ✅ Tu cita de {servicio} quedó el {fecha} a las {hora} con {profesional}. 📍 {direccion}', 'All set, {cliente}! ✅ Your {servicio} is on {fecha} at {hora} with {profesional}. 📍 {direccion}'],
  },
  // ── Cero inasistencias
  {
    id: 'remind', stage: 'noshow', icon: 'bell', impact: 'noshow', defaultOn: true,
    title: ['Recordatorio 48 h y 2 h antes', 'Reminders 48h & 2h before'],
    desc: ['Dos recordatorios por WhatsApp con botón para confirmar o reprogramar.', 'Two WhatsApp reminders with a button to confirm or reschedule.'],
    trigger: ['48 h y 2 h antes de la cita', '48h and 2h before'],
    message: ['Hola {cliente} 👋 Te esperamos el {fecha} a las {hora} para tu {servicio}. Responde 1 para CONFIRMAR o 2 para REPROGRAMAR.', 'Hi {cliente} 👋 See you on {fecha} at {hora} for your {servicio}. Reply 1 to CONFIRM or 2 to RESCHEDULE.'],
  },
  {
    id: 'autoconfirm', stage: 'noshow', icon: 'check', impact: 'hours', defaultOn: true, internal: true,
    title: ['Confirmación automática', 'Auto-confirm from reply'],
    desc: ['Cuando el cliente responde "1", la cita pasa sola a Confirmada. Si no responde en 24 h, avisa a recepción.', 'When the client replies "1" the appointment turns Confirmed. No reply in 24h alerts the front desk.'],
    trigger: ['Al responder el recordatorio', 'On reminder reply'],
    message: ['✅ {cliente} confirmó su cita de mañana a las {hora}. · ⚠️ 3 citas de mañana siguen sin confirmar: te dejamos la lista para llamar.', '✅ {cliente} confirmed tomorrow at {hora}. · ⚠️ 3 of tomorrow’s appointments are still unconfirmed: here’s the call list.'],
  },
  {
    id: 'prep', stage: 'noshow', icon: 'list', impact: 'none', defaultOn: false,
    title: ['Instrucciones de preparación', 'Prep instructions'],
    desc: ['Indicaciones según el servicio: ayuno, traer estudios, llegar sin esmalte, cartilla de vacunación…', 'Service-specific prep: fasting, bring results, come without polish, vaccination card…'],
    trigger: ['24 h antes', '24h before'],
    message: ['{cliente}, para tu {servicio} de mañana: {preparacion}. ¡Gracias!', '{cliente}, for tomorrow’s {servicio}: {preparacion}. Thanks!'],
  },
  {
    id: 'deposit', stage: 'noshow', icon: 'coin', impact: 'none', defaultOn: false,
    title: ['Anticipo para clientes de riesgo', 'Deposit for no-show risk'],
    desc: ['Quien ya faltó 2 veces deja un anticipo para reservar en línea.', 'Clients with 2 no-shows leave a deposit to book online.'],
    trigger: ['2 o más inasistencias', '2+ no-shows'],
    message: ['Hola {cliente}, para apartar tu cita del {fecha} pedimos un anticipo de {anticipo} que se descuenta del total: {link}', 'Hi {cliente}, to hold your {fecha} appointment we ask for a {anticipo} deposit, deducted from the total: {link}'],
  },
  // ── El día de la cita
  {
    id: 'daily', stage: 'day', icon: 'sun', impact: 'hours', defaultOn: true, internal: true,
    title: ['Resumen diario para el dueño', 'Daily summary for the owner'],
    desc: ['Cada mañana a las 7:00: citas del día, ingreso esperado y quién llega primero.', 'Every morning at 7:00: today’s appointments, expected revenue and first client.'],
    trigger: ['Todos los días 7:00 am', 'Daily at 7:00 am'],
    message: ['☀️ Buenos días. Hoy tienes {citas} citas y un ingreso esperado de {ingreso}. Primera cita: {cliente} a las {hora}.', '☀️ Good morning. Today: {citas} appointments, {ingreso} expected. First up: {cliente} at {hora}.'],
  },
  {
    id: 'late', stage: 'day', icon: 'clock', impact: 'none', defaultOn: false,
    title: ['Aviso de retraso', 'Running-late notice'],
    desc: ['Un toque y los siguientes clientes saben que vas 15 minutos tarde.', 'One tap and the next clients know you’re running 15 min late.'],
    trigger: ['Manual, desde la agenda', 'Manual, from the calendar'],
    message: ['Hola {cliente}, vamos con 15 min de retraso. Tu cita de las {hora} empieza aprox. 15 min después. ¡Gracias por tu paciencia! 🙏', 'Hi {cliente}, we’re running 15 min behind. Your {hora} appointment will start ~15 min later. Thanks for your patience! 🙏'],
  },
  {
    id: 'noshowauto', stage: 'day', icon: 'alert', impact: 'none', defaultOn: false,
    title: ['Inasistencia y reprogramación', 'No-show & reschedule'],
    desc: ['Si pasan 15 min sin llegar, marca la cita como "No asistió" y ofrece reprogramar.', 'After 15 min without check-in, marks the no-show and offers to reschedule.'],
    trigger: ['15 min después de la hora', '15 min after start'],
    message: ['{cliente}, te esperamos hoy a las {hora} 😕 ¿Todo bien? Reprograma aquí cuando quieras: {link}', '{cliente}, we missed you at {hora} today 😕 All good? Reschedule anytime: {link}'],
  },
  // ── Después
  {
    id: 'review', stage: 'after', icon: 'star', impact: 'reviews', defaultOn: true,
    title: ['Pedir reseña en Google', 'Google review request'],
    desc: ['2 h después de la visita pregunta cómo le fue. Sólo con 4–5 ⭐ lo invita a Google; si no, te llega el comentario en privado.', '2h after the visit asks how it went. Only 4–5 ⭐ are sent to Google; otherwise feedback comes to you privately.'],
    trigger: ['2 h después de completar', '2h after completion'],
    message: ['¡Gracias por venir, {cliente}! ¿Cómo calificarías tu {servicio} con {profesional}? Responde del 1 al 5 ⭐', 'Thanks for coming, {cliente}! How would you rate your {servicio} with {profesional}? Reply 1–5 ⭐'],
  },
  {
    id: 'followup', stage: 'after', icon: 'repeat', impact: 'none', defaultOn: false, only: ['vet', 'medical', 'dental', 'fitness'],
    title: ['Cita de seguimiento automática', 'Automatic follow-up'],
    desc: ['Servicios que requieren control (post-operatorio, ajuste de brackets, segunda dosis) dejan apartada la siguiente cita.', 'Services that need a follow-up (post-op, braces adjustment, second dose) pre-book the next visit.'],
    trigger: ['Al completar el servicio', 'On completion'],
    message: ['{cliente}, te apartamos tu control para el {fecha} a las {hora}. Responde 1 para confirmar o 2 para cambiarlo.', '{cliente}, we’ve held your follow-up for {fecha} at {hora}. Reply 1 to confirm or 2 to change it.'],
  },
  {
    id: 'care', stage: 'after', icon: 'sparkle', impact: 'none', defaultOn: false,
    title: ['Cuidados posteriores', 'Aftercare tips'],
    desc: ['Envía los cuidados del servicio: post-operatorio, cuidado de uñas, del color, del tratamiento…', 'Sends aftercare for the service: post-op, nail care, color care…'],
    trigger: ['1 h después de completar', '1h after completion'],
    message: ['{cliente}, para que tu {servicio} dure más: {cuidados} Cualquier duda, escríbenos aquí.', '{cliente}, to make your {servicio} last: {cuidados} Any questions, just reply here.'],
  },
  // ── Lealtad y negocio
  {
    id: 'rewards', stage: 'loyalty', icon: 'coin', impact: 'loyalty', defaultOn: false,
    title: ['Premio por visitas', 'Visit rewards'],
    desc: ['Cada 6 visitas, la siguiente tiene premio. El sistema lleva la cuenta y avisa al cliente.', 'Every 6 visits, the next one is on the house. Tracked automatically.'],
    trigger: ['Al completar la 6.ª visita', 'On the 6th completed visit'],
    message: ['🎁 {cliente}, ¡completaste 6 visitas en {negocio}! Tu próxima {servicio} tiene 50% de descuento.', '🎁 {cliente}, you’ve completed 6 visits at {negocio}! Your next {servicio} is 50% off.'],
  },
  {
    id: 'vip', stage: 'loyalty', icon: 'star', impact: 'none', defaultOn: true, internal: true,
    title: ['Etiqueta VIP automática', 'Automatic VIP tag'],
    desc: ['Los clientes con más visitas o gasto se marcan como VIP y tienen prioridad en la lista de espera.', 'Top clients by visits or spend are tagged VIP and get waitlist priority.'],
    trigger: ['Top 10% de clientes', 'Top 10% of clients'],
    message: ['⭐ {cliente} ahora es cliente VIP ({visitas} visitas).', '⭐ {cliente} is now a VIP client ({visitas} visits).'],
  },
  {
    id: 'weekly', stage: 'loyalty', icon: 'chart', impact: 'hours', defaultOn: true, internal: true,
    title: ['Reporte semanal', 'Weekly report'],
    desc: ['Cada lunes: ingresos, ocupación, inasistencias y el servicio estrella vs. la semana anterior.', 'Every Monday: revenue, occupancy, no-shows and top service vs. last week.'],
    trigger: ['Lunes 8:00 am', 'Mondays 8:00 am'],
    message: ['📊 Semana pasada: {ingreso} en ingresos, {citas} citas. Servicio estrella: {servicio}.', '📊 Last week: {ingreso} revenue, {citas} appointments. Top service: {servicio}.'],
  },
];

/** Días ideales entre visitas según el giro */
export const REBOOK_DAYS: Record<BusinessType, number> = {
  vet: 90, nails: 21, barber: 21, medical: 90, dental: 30, spa: 30, salon: 42, fitness: 7, generic: 30,
};

export const PREP: Record<BusinessType, Bi> = {
  vet: ['trae su cartilla de vacunación y, si es cirugía, 8 h de ayuno 🐾', 'bring the vaccination card and, for surgery, 8h fasting 🐾'],
  nails: ['llega con las uñas sin esmalte para ahorrar tiempo 💅', 'come without polish to save time 💅'],
  barber: ['si quieres un estilo específico, trae una foto de referencia 💈', 'bring a reference photo if you want a specific style 💈'],
  medical: ['trae tus estudios previos e identificación 🩺', 'bring previous results and ID 🩺'],
  dental: ['cepíllate antes de venir y trae tus radiografías 🦷', 'brush before coming and bring your X-rays 🦷'],
  spa: ['llega 10 min antes para disfrutar el té de bienvenida 🌿', 'arrive 10 min early for welcome tea 🌿'],
  salon: ['ven con el cabello seco y sin productos ✂️', 'come with dry hair, no products ✂️'],
  fitness: ['trae ropa cómoda, toalla y agua 🏋️', 'bring comfy clothes, a towel and water 🏋️'],
  generic: ['llega 5 min antes', 'arrive 5 min early'],
};

export const CARE: Record<BusinessType, Bi> = {
  vet: ['mantén la herida limpia, usa el collar isabelino y evita baños por 7 días.', 'keep the wound clean, use the cone and no baths for 7 days.'],
  nails: ['evita agua caliente 24 h y usa aceite de cutícula a diario.', 'avoid hot water for 24h and use cuticle oil daily.'],
  barber: ['usa un poco de cera mate y lava con shampoo suave.', 'use a little matte wax and a gentle shampoo.'],
  medical: ['toma el tratamiento completo y agenda tu control en 2 semanas.', 'finish the full treatment and book your check-up in 2 weeks.'],
  dental: ['evita alimentos duros y bebidas con color por 48 h.', 'avoid hard food and dark drinks for 48h.'],
  spa: ['toma mucha agua hoy y evita el sol directo.', 'drink plenty of water today and avoid direct sun.'],
  salon: ['espera 48 h antes del primer lavado y usa shampoo sin sulfatos.', 'wait 48h before washing and use sulfate-free shampoo.'],
  fitness: ['estira 10 min y prioriza proteína en tu siguiente comida.', 'stretch 10 min and prioritize protein next meal.'],
  generic: ['cualquier duda, estamos para ayudarte.', 'we’re here if you need anything.'],
};
