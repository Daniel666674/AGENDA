import type { DemoConfig } from '../types';

const demo: DemoConfig = {
  slug: 'northside',
  type: 'medical',
  name: 'Northside Family Clinic',
  tagline: 'Primary care for the whole family',
  preparedFor: 'Dr. Vidal',
  phone: '+1 512 555 0142',
  address: '2100 N Lamar Blvd, Austin, TX',
  lang: 'en',
  currency: 'USD',
  staff: [
    { name: 'Dr. Alex Vidal', role: 'Family medicine' },
    { name: 'Dr. Paula Mendez', role: 'Pediatrics' },
    { name: 'Sarah Kim, NP', role: 'Nurse practitioner' },
  ],
};

export default demo;
