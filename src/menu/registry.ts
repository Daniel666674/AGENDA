// Demos de restaurante:  ?m=slug  (archivo en src/restaurantes)  ·  ?md=xxxx  (creado en el Estudio)
import type { MenuConfig } from './types';
import { encodeConfig } from '../config/registry';

const modules = import.meta.glob<{ default: MenuConfig }>('../restaurantes/*.ts', { eager: true });

export const FILE_MENUS: MenuConfig[] = Object.entries(modules)
  .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
  .map(([, m]) => m.default)
  .sort((a, b) => a.name.localeCompare(b.name));

export function decodeMenu(s: string): MenuConfig | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const cfg = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as MenuConfig;
    return cfg.slug && cfg.name && cfg.type ? cfg : null;
  } catch {
    return null;
  }
}

export function resolveMenu(search = location.search): MenuConfig | null {
  const p = new URLSearchParams(search);
  const md = p.get('md');
  if (md) return decodeMenu(md);
  const m = p.get('m');
  if (m) return FILE_MENUS.find((x) => x.slug === m) ?? null;
  return null;
}

export const encodeMenu = (cfg: MenuConfig) => encodeConfig(cfg as never);

/** Enlace base del demo actual (conserva ?m= o ?md=) */
export const baseLink = () => location.origin + location.pathname + location.search;
