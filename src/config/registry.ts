// Encuentra qué demo abrir según la URL:
//   ?c=slug          → archivo src/clientes/slug.ts
//   ?d=xxxxx         → demo creado desde el Generador (toda la config va en el enlace)
//   (nada)           → el Estudio de demos (lista + generador)
import type { DemoConfig } from '../types';

const modules = import.meta.glob<{ default: DemoConfig }>('../clientes/*.ts', { eager: true });

export const FILE_DEMOS: DemoConfig[] = Object.entries(modules)
  .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
  .map(([, m]) => m.default)
  .sort((a, b) => a.name.localeCompare(b.name));

export function encodeConfig(cfg: DemoConfig): string {
  const json = JSON.stringify(cfg);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfig(s: string): DemoConfig | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const cfg = JSON.parse(new TextDecoder().decode(bytes)) as DemoConfig;
    if (!cfg.slug || !cfg.name || !cfg.type) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function resolveDemo(search: string = location.search): DemoConfig | null {
  const p = new URLSearchParams(search);
  const d = p.get('d');
  if (d) return decodeConfig(d);
  const c = p.get('c');
  if (c) return FILE_DEMOS.find((x) => x.slug === c) ?? null;
  return null;
}

export function demoUrl(cfg: DemoConfig, fromFile: boolean): string {
  const base = location.origin + location.pathname;
  return fromFile ? `${base}?c=${encodeURIComponent(cfg.slug)}` : `${base}?d=${encodeConfig(cfg)}`;
}
