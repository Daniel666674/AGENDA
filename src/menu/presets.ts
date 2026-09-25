// Cartas de ejemplo por tipo de local (precios en pesos colombianos).
import type { Theme } from '../types';
import type { ItemTag, OptionGroup, VenueType } from './types';

type O = Omit<OptionGroup, 'id' | 'choices'> & { choices: [string, number][] };

export interface PresetItem {
  name: string;
  description: string;
  price: number;
  emoji: string;
  prep: number;
  tags?: ItemTag[];
  options?: O[];
}

export interface VenuePreset {
  label: string;
  emoji: string;
  tagline: string;
  theme: Theme;
  zones: [string, number][];
  categories: { name: string; emoji: string; items: PresetItem[] }[];
}

// Grupos de opciones reutilizables
const TERMINO: O = { name: 'Término de la carne', required: true, max: 1, choices: [['Medio', 0], ['Tres cuartos', 0], ['Bien asado', 0]] };
const JUGO: O = { name: 'Sabor', required: true, max: 1, choices: [['Mora', 0], ['Lulo', 0], ['Maracuyá', 0], ['Mango', 0], ['Guanábana', 1000]] };
const EN_LECHE: O = { name: 'Preparación', required: true, max: 1, choices: [['En agua', 0], ['En leche', 1500]] };
const LECHE: O = { name: 'Leche', required: true, max: 1, choices: [['Entera', 0], ['Deslactosada', 0], ['Almendras', 2500], ['Avena', 2500]] };
const TAMANO: O = { name: 'Tamaño', required: true, max: 1, choices: [['8 oz', 0], ['12 oz', 2000]] };
const BURGER_EXTRAS: O = { name: 'Adiciones', required: false, max: 4, choices: [['Tocineta', 4000], ['Queso cheddar extra', 3000], ['Huevo frito', 2500], ['Jalapeños', 2000]] };
const COMBO: O = { name: '¿Lo haces combo?', required: false, max: 1, choices: [['Combo: papas + gaseosa', 9000]] };
const ALITAS: O = { name: 'Salsa', required: true, max: 1, choices: [['BBQ', 0], ['Búfalo picante', 0], ['Miel mostaza', 0]] };
const RON: O = { name: 'Licor', required: true, max: 1, choices: [['Ron blanco', 0], ['Ron añejo', 4000]] };
const MICHE: O = { name: '¿Michelada?', required: false, max: 1, choices: [['Michelada', 4000]] };

export const VENUES: Record<VenueType, VenuePreset> = {
  restaurant: {
    label: 'Restaurante',
    emoji: '🍽️',
    tagline: 'Cocina colombiana de la casa',
    theme: { accent: '#b5452b', paper: '#f6efe6', mode: 'light', fontDisplay: 'Fraunces', fontBody: 'Manrope', radius: 16 },
    zones: [['Salón', 10], ['Terraza', 6]],
    categories: [
      {
        name: 'Entradas', emoji: '🥟', items: [
          { name: 'Empanadas de pipián (3)', description: 'Con ají de la casa y limón', price: 12000, emoji: '🥟', prep: 8, tags: ['recomendado'] },
          { name: 'Patacones con hogao', description: 'Plátano verde crocante, hogao y guacamole', price: 14000, emoji: '🍌', prep: 10, tags: ['vegetariano'] },
          { name: 'Chicharrón con arepa', description: 'Chicharrón carnudo, arepa de maíz y limón', price: 18000, emoji: '🥓', prep: 10 },
          { name: 'Ceviche de camarón', description: 'Camarón, salsa rosada, cebolla morada y galletas', price: 26000, emoji: '🍤', prep: 8, tags: ['nuevo'] },
        ],
      },
      {
        name: 'Platos fuertes', emoji: '🍛', items: [
          { name: 'Bandeja paisa', description: 'Frijoles, arroz, carne molida, chicharrón, chorizo, huevo, maduro, arepa y aguacate', price: 38000, emoji: '🍛', prep: 18, tags: ['recomendado'], options: [{ name: 'Adiciones', required: false, max: 2, choices: [['Huevo adicional', 3000], ['Chicharrón adicional', 8000]] }] },
          { name: 'Ajiaco santafereño', description: 'Con pollo desmechado, mazorca, crema, alcaparras y arroz', price: 32000, emoji: '🍲', prep: 15 },
          { name: 'Churrasco 300 g', description: 'Con chimichurri y un acompañante', price: 48000, emoji: '🥩', prep: 22, options: [TERMINO, { name: 'Acompañante', required: true, max: 1, choices: [['Papa criolla', 0], ['Yuca frita', 0], ['Ensalada de la casa', 0]] }] },
          { name: 'Sobrebarriga en salsa criolla', description: 'Cocción lenta, papa salada y arroz', price: 36000, emoji: '🍖', prep: 16 },
          { name: 'Mojarra frita', description: 'Patacón, arroz con coco y ensalada', price: 42000, emoji: '🐟', prep: 20 },
          { name: 'Arroz con pollo', description: 'Con papas a la francesa y ensalada', price: 28000, emoji: '🍗', prep: 14 },
        ],
      },
      {
        name: 'Bebidas', emoji: '🥤', items: [
          { name: 'Limonada de coco', description: 'La favorita de la casa', price: 12000, emoji: '🥥', prep: 5, tags: ['recomendado'] },
          { name: 'Jugo natural', description: 'Fruta fresca del día', price: 9000, emoji: '🧃', prep: 5, options: [JUGO, EN_LECHE] },
          { name: 'Gaseosa', description: '400 ml', price: 5000, emoji: '🥤', prep: 1 },
          { name: 'Cerveza nacional', description: 'Club Colombia, Águila o Poker', price: 7000, emoji: '🍺', prep: 1, options: [MICHE] },
        ],
      },
      {
        name: 'Postres', emoji: '🍮', items: [
          { name: 'Postre de natas', description: 'Receta tradicional boyacense', price: 12000, emoji: '🍮', prep: 3 },
          { name: 'Torta tres leches', description: 'Húmeda, con canela', price: 11000, emoji: '🍰', prep: 3 },
          { name: 'Brevas con arequipe', description: 'Con queso campesino', price: 10000, emoji: '🍯', prep: 3 },
        ],
      },
    ],
  },
  cafe: {
    label: 'Café / panadería',
    emoji: '☕',
    tagline: 'Café de origen y horneados del día',
    theme: { accent: '#6b4a33', paper: '#f4eee6', mode: 'light', fontDisplay: 'DM Serif Display', fontBody: 'DM Sans', radius: 18 },
    zones: [['Salón', 8], ['Terraza', 4], ['Barra', 3]],
    categories: [
      {
        name: 'Café', emoji: '☕', items: [
          { name: 'Tinto', description: 'Café colombiano filtrado', price: 3500, emoji: '☕', prep: 2 },
          { name: 'Americano', description: 'Doble shot de espresso', price: 6000, emoji: '☕', prep: 3 },
          { name: 'Capuchino', description: 'Espresso, leche texturizada y cacao', price: 8500, emoji: '☕', prep: 4, tags: ['recomendado'], options: [TAMANO, LECHE] },
          { name: 'Latte', description: 'Suave y cremoso', price: 9000, emoji: '🥛', prep: 4, options: [TAMANO, LECHE, { name: 'Sirope', required: false, max: 1, choices: [['Vainilla', 2000], ['Caramelo', 2000], ['Avellana', 2000]] }] },
          { name: 'Chemex de origen Huila', description: 'Notas de panela y frutos rojos · 2 tazas', price: 14000, emoji: '🫖', prep: 7, tags: ['nuevo'] },
          { name: 'Cold brew', description: 'Infusión en frío por 18 horas', price: 11000, emoji: '🧊', prep: 2 },
        ],
      },
      {
        name: 'Otras bebidas', emoji: '🍫', items: [
          { name: 'Chocolate santafereño', description: 'Con queso y almojábana', price: 9500, emoji: '🍫', prep: 5, tags: ['recomendado'] },
          { name: 'Aromática de frutas', description: 'Frutas frescas y hierbabuena', price: 5000, emoji: '🌿', prep: 4 },
          { name: 'Frappé de arequipe', description: 'Con crema batida', price: 13000, emoji: '🥤', prep: 5 },
          { name: 'Jugo de naranja', description: 'Recién exprimido', price: 8000, emoji: '🍊', prep: 3 },
        ],
      },
      {
        name: 'Horneados', emoji: '🥐', items: [
          { name: 'Pandebono', description: 'Recién salido del horno', price: 3500, emoji: '🧀', prep: 1, tags: ['recomendado'] },
          { name: 'Almojábana', description: 'Suave, de cuajada', price: 3500, emoji: '🧀', prep: 1 },
          { name: 'Croissant de almendras', description: 'Hojaldre de mantequilla', price: 8500, emoji: '🥐', prep: 2 },
          { name: 'Torta de zanahoria', description: 'Con frosting de queso crema', price: 9500, emoji: '🍰', prep: 2 },
          { name: 'Muffin de arándanos', description: 'Integral', price: 7500, emoji: '🧁', prep: 1 },
        ],
      },
      {
        name: 'Desayunos', emoji: '🍳', items: [
          { name: 'Calentado paisa', description: 'Frijoles, arroz, huevo, chorizo y arepa', price: 18000, emoji: '🍳', prep: 12 },
          { name: 'Huevos pericos con arepa', description: 'Con tomate, cebolla y queso', price: 14000, emoji: '🍳', prep: 9 },
          { name: 'Tostada de aguacate', description: 'Pan de masa madre, huevo pochado y semillas', price: 19000, emoji: '🥑', prep: 10, tags: ['vegetariano'] },
          { name: 'Changua', description: 'Con huevo, cilantro y calado', price: 14000, emoji: '🥣', prep: 8 },
        ],
      },
    ],
  },
  bar: {
    label: 'Bar / gastrobar',
    emoji: '🍸',
    tagline: 'Cócteles de autor y buena música',
    theme: { accent: '#d4a24c', paper: '#f2ede4', mode: 'dark', fontDisplay: 'Syne', fontBody: 'Work Sans', radius: 10 },
    zones: [['Salón', 8], ['Barra', 6], ['Terraza', 4]],
    categories: [
      {
        name: 'Cócteles', emoji: '🍹', items: [
          { name: 'Lulada con aguardiente', description: 'Coctel de la casa: lulo, limón y aguardiente', price: 26000, emoji: '🍹', prep: 5, tags: ['recomendado'] },
          { name: 'Mojito', description: 'Hierbabuena, limón y soda', price: 28000, emoji: '🍹', prep: 5, options: [RON] },
          { name: 'Margarita', description: 'Tequila, triple sec y limón', price: 30000, emoji: '🍸', prep: 5, options: [{ name: 'Estilo', required: true, max: 1, choices: [['Clásica', 0], ['De maracuyá', 2000], ['Picante', 2000]] }] },
          { name: 'Gin tonic', description: 'Con pepino y enebro', price: 32000, emoji: '🍸', prep: 4 },
          { name: 'Aperol spritz', description: 'Aperol, espumoso y naranja', price: 32000, emoji: '🍊', prep: 4, tags: ['nuevo'] },
          { name: 'Carajillo', description: 'Licor 43 y espresso', price: 25000, emoji: '☕', prep: 4 },
        ],
      },
      {
        name: 'Cervezas', emoji: '🍺', items: [
          { name: 'Club Colombia', description: 'Dorada, roja o negra', price: 9000, emoji: '🍺', prep: 1, options: [MICHE] },
          { name: 'Artesanal de la casa', description: 'IPA o Golden Ale · pinta', price: 15000, emoji: '🍻', prep: 2, tags: ['recomendado'] },
          { name: 'Cubetazo (6 cervezas)', description: 'Nacionales bien frías', price: 48000, emoji: '🪣', prep: 3, tags: ['para-compartir'] },
        ],
      },
      {
        name: 'Botellas', emoji: '🥃', items: [
          { name: 'Aguardiente Antioqueño (media)', description: 'Con gaseosa y limones', price: 65000, emoji: '🥃', prep: 3, tags: ['para-compartir'] },
          { name: 'Ron Viejo de Caldas 3 años (media)', description: 'Con Coca-Cola y hielo', price: 75000, emoji: '🥃', prep: 3, tags: ['para-compartir'] },
          { name: 'Whisky (trago)', description: 'Old Parr 12 años', price: 22000, emoji: '🥃', prep: 2 },
        ],
      },
      {
        name: 'Para picar', emoji: '🍗', items: [
          { name: 'Picada para compartir', description: 'Chorizo, chicharrón, morcilla, papa criolla y arepitas', price: 58000, emoji: '🍖', prep: 18, tags: ['para-compartir', 'recomendado'] },
          { name: 'Alitas (8)', description: 'Con apio y salsa ranch', price: 32000, emoji: '🍗', prep: 15, options: [ALITAS] },
          { name: 'Nachos con guacamole', description: 'Queso fundido, pico de gallo y jalapeños', price: 29000, emoji: '🌮', prep: 10, tags: ['picante'] },
          { name: 'Papas rústicas', description: 'Con paprika y alioli', price: 16000, emoji: '🍟', prep: 9, tags: ['vegetariano'] },
        ],
      },
    ],
  },
  burger: {
    label: 'Comida rápida',
    emoji: '🍔',
    tagline: 'Hamburguesas smash y perros como deben ser',
    theme: { accent: '#e04e1b', paper: '#f7f1e8', mode: 'light', fontDisplay: 'Archivo Black', fontBody: 'Archivo', radius: 12 },
    zones: [['Salón', 10], ['Terraza', 4]],
    categories: [
      {
        name: 'Hamburguesas', emoji: '🍔', items: [
          { name: 'Clásica', description: 'Carne 150 g, queso, lechuga, tomate y salsa de la casa', price: 24000, emoji: '🍔', prep: 12, tags: ['recomendado'], options: [TERMINO, BURGER_EXTRAS, COMBO] },
          { name: 'Doble smash', description: 'Dos carnes smash, doble cheddar, cebolla y pepinillos', price: 32000, emoji: '🍔', prep: 12, tags: ['recomendado'], options: [BURGER_EXTRAS, COMBO] },
          { name: 'BBQ tocineta', description: 'Tocineta crocante, aros de cebolla y BBQ', price: 29000, emoji: '🥓', prep: 13, options: [TERMINO, BURGER_EXTRAS, COMBO] },
          { name: 'Pollo crispy', description: 'Pechuga apanada, coleslaw y miel picante', price: 26000, emoji: '🐔', prep: 12, tags: ['picante'], options: [BURGER_EXTRAS, COMBO] },
          { name: 'Veggie de garbanzo', description: 'Hamburguesa de garbanzo, aguacate y rúgula', price: 25000, emoji: '🌱', prep: 11, tags: ['vegetariano', 'nuevo'], options: [COMBO] },
        ],
      },
      {
        name: 'Perros y salchipapas', emoji: '🌭', items: [
          { name: 'Perro colombiano', description: 'Salchicha, papita ripio, queso, piña y salsas', price: 18000, emoji: '🌭', prep: 8 },
          { name: 'Salchipapa especial', description: 'Papas, salchicha, maíz, queso y huevos de codorniz', price: 22000, emoji: '🍟', prep: 10, tags: ['para-compartir'] },
        ],
      },
      {
        name: 'Acompañamientos', emoji: '🍟', items: [
          { name: 'Papas a la francesa', description: 'Crocantes', price: 8000, emoji: '🍟', prep: 6 },
          { name: 'Aros de cebolla', description: 'Con salsa BBQ', price: 10000, emoji: '🧅', prep: 7 },
          { name: 'Nuggets (8)', description: 'Con miel mostaza', price: 14000, emoji: '🍗', prep: 8 },
        ],
      },
      {
        name: 'Bebidas y postres', emoji: '🥤', items: [
          { name: 'Malteada', description: '16 oz', price: 13000, emoji: '🥤', prep: 5, options: [{ name: 'Sabor', required: true, max: 1, choices: [['Chocolate', 0], ['Fresa', 0], ['Vainilla', 0], ['Oreo', 2000]] }] },
          { name: 'Gaseosa', description: '400 ml', price: 5000, emoji: '🥤', prep: 1 },
          { name: 'Limonada natural', description: 'Bien fría', price: 7000, emoji: '🍋', prep: 3 },
          { name: 'Brownie con helado', description: 'Tibio, con helado de vainilla', price: 12000, emoji: '🍫', prep: 5 },
        ],
      },
    ],
  },
};
