// ─────────────────────────────────────────────────────────────────────────────
//  PLANTILLA PARA UN NUEVO PROSPECTO
//  1. Copia este archivo y renómbralo, por ejemplo:  src/clientes/barberia-el-rey.ts
//  2. Cambia los datos de abajo (solo `slug`, `type` y `name` son obligatorios).
//  3. Abre el demo en:  https://TU-DOMINIO/?c=barberia-el-rey
//  Los archivos que empiezan con "_" no se publican.
// ─────────────────────────────────────────────────────────────────────────────
import type { DemoConfig } from '../types';

const demo: DemoConfig = {
  slug: 'mi-negocio', // lo que va en la URL (?c=mi-negocio), sin espacios ni acentos
  type: 'barber', // vet | nails | barber | medical | dental | spa | salon | fitness | generic
  name: 'Mi Negocio',
  tagline: 'Frase corta del negocio',
  preparedFor: 'Carlos', // nombre del dueño: sale en la bienvenida ("Preparado para Carlos")
  logo: '', // ej: '/logos/mi-negocio.png' (sube el archivo a public/logos) o una URL
  phone: '+52 55 1234 5678',
  whatsapp: '+52 55 1234 5678',
  address: 'Av. Siempre Viva 742, Col. Centro',
  instagram: '@minegocio',
  lang: 'es', // 'es' | 'en'
  currency: 'MXN', // MXN, USD, COP, EUR, ARS, CLP, PEN, GTQ, DOP, CRC…
  // theme: { accent: '#c8a063', mode: 'dark', fontDisplay: 'Fraunces', fontBody: 'Inter Tight' },
  // staff: [{ name: 'Andrés', role: 'Master barber' }, { name: 'Diego', role: 'Barbero' }],
  // services: [{ name: 'Corte clásico', duration: 30, price: 250, category: 'Cortes' }],
};

export default demo;
