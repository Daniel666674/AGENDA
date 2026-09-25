// Operaciones del negocio (todas con "deshacer")
import type { Appointment, AppState, Client, Status } from '../types';
import { getState, uid, undo, update } from './store';
import { uiActions } from './ui';
import { makeHelpers } from '../lib/useApp';
import { addDays, parseLocal, toLocal } from '../lib/date';
import { reminderText, whatsappLink } from '../lib/messaging';

const h = () => makeHelpers(getState());

export function undoLast() {
  const label = undo();
  if (label) uiActions.toast(h().t('t_undone', { label }));
}

function toastUndo(text: string) {
  uiActions.toast(text, { undo: true });
}

export function setStatus(id: string, status: Status) {
  const { t, status: label } = h();
  update(t('t_status', { status: label(status) }), (d) => {
    const a = d.appointments.find((x) => x.id === id);
    if (!a) return;
    a.status = status;
    if (status === 'completed') a.paid = true;
  });
  toastUndo(t('t_status', { status: label(status) }));
}

export function moveAppointment(id: string, start: string, staffId: string) {
  const { t, timeOf } = h();
  update(t('t_moved', { time: timeOf(start) }), (d) => {
    const a = d.appointments.find((x) => x.id === id);
    if (a) {
      a.start = start;
      a.staffId = staffId;
    }
  });
  toastUndo(t('t_moved', { time: timeOf(start) }));
}

export function resizeAppointment(id: string, duration: number) {
  const { t } = h();
  update(t('t_resized', { n: duration }), (d) => {
    const a = d.appointments.find((x) => x.id === id);
    if (a) a.duration = duration;
  });
  toastUndo(t('t_resized', { n: duration }));
}

export type Repeat = { every: 0 | 1 | 2 | 4; times: number };

export function saveAppointment(appt: Appointment, repeat: Repeat = { every: 0, times: 1 }) {
  const { t } = h();
  update(t('t_saved'), (d) => {
    const i = d.appointments.findIndex((x) => x.id === appt.id);
    if (i >= 0) {
      d.appointments[i] = appt;
      return;
    }
    if (repeat.every && repeat.times > 1) {
      const seriesId = uid('ser');
      const base = parseLocal(appt.start);
      for (let k = 0; k < repeat.times; k++) {
        d.appointments.push({ ...appt, id: k === 0 ? appt.id : uid('apt'), seriesId, start: toLocal(addDays(base, 7 * repeat.every * k)) });
      }
    } else d.appointments.push(appt);
  });
  toastUndo(t('t_saved'));
}

export function deleteAppointment(id: string) {
  const { t } = h();
  update(t('t_deleted'), (d) => {
    d.appointments = d.appointments.filter((x) => x.id !== id);
  });
  toastUndo(t('t_deleted'));
}

export function saveClient(c: Client) {
  const { t } = h();
  update(t('t_client_saved'), (d) => {
    const i = d.clients.findIndex((x) => x.id === c.id);
    if (i >= 0) d.clients[i] = c;
    else d.clients.push(c);
  });
  uiActions.toast(t('t_client_saved'), { tone: 'success' });
}

export function deleteClient(id: string) {
  const { t } = h();
  update(t('t_deleted'), (d) => {
    d.clients = d.clients.filter((x) => x.id !== id);
    d.appointments = d.appointments.filter((x) => x.clientId !== id);
    d.waitlist = d.waitlist.filter((x) => x.clientId !== id);
  });
  toastUndo(t('t_deleted'));
}

export function remind(a: Appointment) {
  const s = getState();
  const help = h();
  const c = s.clients.find((x) => x.id === a.clientId);
  if (!c) return;
  window.open(whatsappLink(c.phone, reminderText(s, help, a)), '_blank', 'noopener');
  update('reminder', (d) => {
    const x = d.appointments.find((y) => y.id === a.id);
    if (x) x.reminded = true;
  });
  uiActions.toast(help.t('t_reminder'), { tone: 'success' });
}

export function mutate(label: string, fn: (d: AppState) => void) {
  update(label, fn);
}

export function newClient(partial: Partial<Client> = {}): Client {
  return { id: uid('cli'), name: '', phone: '', email: '', notes: '', tags: [], pets: [], createdAt: toLocal(new Date()), ...partial };
}
