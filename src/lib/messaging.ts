// WhatsApp, llamadas y archivos de calendario (.ics)
import type { AppState, Appointment } from '../types';
import type { Helpers } from './useApp';
import { endOf, parseLocal } from './date';

export function digits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;
}

export function reminderText(s: AppState, h: Helpers, a: Appointment): string {
  const c = s.clients.find((x) => x.id === a.clientId);
  const svc = s.services.find((x) => x.id === a.serviceId);
  const st = s.staff.find((x) => x.id === a.staffId);
  const pet = c?.pets.find((p) => p.id === a.petId);
  const firstName = (c?.name ?? '').split(' ')[0];
  return s.business.reminderTemplate
    .split('{cliente}').join(firstName + (pet ? ` (${pet.name})` : ''))
    .split('{servicio}').join(svc?.name ?? '')
    .split('{fecha}').join(h.longDate(parseLocal(a.start)))
    .split('{hora}').join(h.timeOf(a.start))
    .split('{negocio}').join(s.business.name)
    .split('{profesional}').join(st?.name ?? '');
}

const icsDate = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

export function downloadIcs(s: AppState, a: Appointment) {
  const svc = s.services.find((x) => x.id === a.serviceId);
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agenda//ES', 'BEGIN:VEVENT',
    `UID:${a.id}@agenda`, `DTSTART:${icsDate(parseLocal(a.start))}`, `DTEND:${icsDate(endOf(a.start, a.duration))}`,
    `SUMMARY:${svc?.name ?? ''} · ${s.business.name}`, `LOCATION:${s.business.address}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  download(`${s.business.name}.ics`, body, 'text/calendar');
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function appointmentsCsv(s: AppState, h: Helpers): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['fecha', 'hora', 'cliente', 'telefono', 'servicio', 'profesional', 'duracion', 'precio', 'estado', 'pagada', 'canal', 'notas']];
  for (const a of [...s.appointments].sort((x, y) => x.start.localeCompare(y.start))) {
    const c = s.clients.find((x) => x.id === a.clientId);
    rows.push([
      a.start.slice(0, 10), a.start.slice(11), c?.name ?? '', c?.phone ?? '',
      s.services.find((x) => x.id === a.serviceId)?.name ?? '', s.staff.find((x) => x.id === a.staffId)?.name ?? '',
      String(a.duration), String(a.price), h.status(a.status), a.paid ? 'si' : 'no', a.source, a.notes,
    ]);
  }
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
}
