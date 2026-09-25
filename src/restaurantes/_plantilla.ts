// ─────────────────────────────────────────────────────────────────────────────
//  PLANTILLA · DEMO DE PEDIDOS POR QR (restaurante, café, bar, comida rápida)
//  1. Copia este archivo:  src/restaurantes/mi-local.ts
//  2. Cambia los datos (sólo slug, type y name son obligatorios)
//  3. Abre:  https://TU-DOMINIO/?m=mi-local
// ─────────────────────────────────────────────────────────────────────────────
import type { MenuConfig } from '../menu/types';

const demo: MenuConfig = {
  slug: 'mi-local',
  type: 'restaurant', // restaurant | cafe | bar | burger
  name: 'Mi Local',
  tagline: 'Frase corta del local',
  preparedFor: 'Don Jorge',
  instagram: '@milocal',
  address: 'Cl. 85 #12-30, Bogotá',
  tables: 14,
  // logo: 'https://…/logo.png',
  // theme: { accent: '#b5452b', mode: 'light' },
  // menu: [{ category: 'Hamburguesas', emoji: '🍔', items: [{ name: 'Clásica', price: 24000, description: '…', photo: 'https://…' }] }],
};

export default demo;
