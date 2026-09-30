// Reservas en vivo entre dispositivos (demo con QR): el celular del prospecto envía,
// la pantalla del vendedor recibe y la cita aparece en la agenda.
import type { Appointment } from '../types';
import { getState, uid } from '../store/store';
import { mutate, newClient } from '../store/actions';
import { uiActions } from '../store/ui';
import { toLocal } from './date';

interface LiveBooking {
  at: number;
  id: string;
  name: string;
  service: string;
  staff: string;
  start: string;
  duration: number;
  price: number;
  pet: string;
}

const local = () => /^(localhost|127\.)/.test(location.hostname) || location.protocol === 'file:';

export function sendLiveBooking(slug: string, a: Appointment, name: string, pet?: string) {
  if (local()) return;
  const s = getState();
  const body = {
    slug,
    id: a.id,
    name,
    pet,
    service: s.services.find((x) => x.id === a.serviceId)?.name,
    staff: s.staff.find((x) => x.id === a.staffId)?.name,
    start: a.start,
    duration: a.duration,
    price: a.price,
  };
  fetch('/api/live', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
}

/** Revisa cada pocos segundos si llegaron reservas desde otro dispositivo */
export function startLiveReceiver(slug: string, onBooked: (name: string, id: string) => void) {
  if (local()) return () => {};
  let since = Date.now() - 2 * 60000;
  let stopped = false;
  const tick = async () => {
    if (stopped || document.visibilityState !== 'visible') return;
    try {
      const r = await fetch(`/api/live?slug=${encodeURIComponent(slug)}&since=${since}`, { cache: 'no-store' });
      if (!r.ok) return;
      const { items } = (await r.json()) as { items: LiveBooking[] };
      for (const it of items.sort((x, y) => x.at - y.at)) {
        since = Math.max(since, it.at);
        importBooking(it, onBooked);
      }
    } catch {
      /* sin red: se reintenta en el siguiente ciclo */
    }
  };
  const i = window.setInterval(tick, 5000);
  tick();
  return () => {
    stopped = true;
    clearInterval(i);
  };
}

function importBooking(it: LiveBooking, onBooked: (name: string, id: string) => void) {
  const s = getState();
  if (s.appointments.some((a) => a.id === it.id)) return; // ya existe (misma pantalla)
  const svc = s.services.find((x) => x.name === it.service) ?? s.services[0];
  const staff = s.staff.find((x) => x.name === it.staff) ?? s.staff.find((x) => x.active) ?? s.staff[0];
  if (!svc || !staff) return;
  const client = newClient({ name: it.name || 'Cliente', tags: ['En línea'] });
  const pet = it.pet ? { id: uid('pet'), name: it.pet, species: '', breed: '' } : null;
  if (pet) client.pets.push(pet);
  const appt: Appointment = {
    id: it.id || uid('apt'),
    clientId: client.id,
    staffId: staff.id,
    serviceId: svc.id,
    petId: pet?.id,
    start: it.start,
    duration: it.duration || svc.duration,
    price: it.price || svc.price,
    status: 'confirmed',
    notes: 'Reserva de prueba desde el celular',
    source: 'online',
    paid: false,
    reminded: false,
    createdAt: toLocal(new Date()),
  };
  mutate('online', (d) => {
    d.clients.push(client);
    d.appointments.push(appt);
  });
  uiActions.highlight(appt.id);
  onBooked(client.name, appt.id);
}
