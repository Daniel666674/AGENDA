// Aplica la identidad visual del negocio (colores + tipografías) a toda la app.
import type { Theme } from '../types';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legible (blanco o casi negro) sobre un color */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.42 ? '#16130f' : '#ffffff';
}

const loadedFonts = new Set<string>();
/** Carga fuentes de Google Fonts (una hoja por familia; si falla con pesos, reintenta sin ellos) */
export function loadFonts(families: string[]) {
  for (const f of new Set(families)) {
    if (!f || loadedFonts.has(f)) continue;
    loadedFonts.add(f);
    const fam = encodeURIComponent(f).replace(/%20/g, '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600;700&display=swap`;
    link.onerror = () => {
      link.onerror = null;
      link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
    };
    document.head.appendChild(link);
  }
}

export function applyTheme(theme: Theme, mode: 'light' | 'dark') {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--on-accent', inkOn(theme.accent));
  root.style.setProperty('--paper', theme.paper);
  root.style.setProperty('--radius', `${theme.radius}px`);
  root.style.setProperty('--font-display', `'${theme.fontDisplay}', ui-serif, Georgia, serif`);
  root.style.setProperty('--font-body', `'${theme.fontBody}', ui-sans-serif, system-ui, sans-serif`);
  loadFonts([theme.fontDisplay, theme.fontBody]);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#121110' : theme.paper);
}

export const FONT_PAIRS: { display: string; body: string; label: string }[] = [
  { display: 'Fraunces', body: 'Nunito Sans', label: 'Fraunces · Nunito Sans' },
  { display: 'Cormorant Garamond', body: 'Jost', label: 'Cormorant · Jost' },
  { display: 'Big Shoulders Display', body: 'Inter Tight', label: 'Big Shoulders · Inter Tight' },
  { display: 'Instrument Serif', body: 'Plus Jakarta Sans', label: 'Instrument Serif · Jakarta' },
  { display: 'Outfit', body: 'Outfit', label: 'Outfit' },
  { display: 'DM Serif Display', body: 'DM Sans', label: 'DM Serif · DM Sans' },
  { display: 'Archivo Black', body: 'Archivo', label: 'Archivo' },
  { display: 'Manrope', body: 'Manrope', label: 'Manrope' },
  { display: 'Playfair Display', body: 'Karla', label: 'Playfair · Karla' },
  { display: 'Syne', body: 'Work Sans', label: 'Syne · Work Sans' },
];
