import type { DemoConfig } from '../types';

const demo: DemoConfig = {
  slug: 'northside',
  type: 'medical',
  name: 'Northside Family Clinic',
  tagline: 'Primary care for the whole family',
  preparedFor: 'Dr. Vidal',
  phone: '+57 300 555 0142',
  address: 'Cra. 43B #1A Sur-29, Medellín',
  lang: 'en',
  staff: [
    { name: 'Dr. Alex Vidal', role: 'Family medicine' },
    { name: 'Dr. Paula Mendez', role: 'Pediatrics' },
    { name: 'Sarah Kim, NP', role: 'Nurse practitioner' },
  ],
};

export default demo;
