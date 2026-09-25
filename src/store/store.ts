// Estado global mínimo con persistencia en el navegador y "deshacer".
// Cambiar a un backend (Supabase, Firebase, API propia) sólo requiere reemplazar load/save.
import { useSyncExternalStore } from 'react';
import type { AppState, DemoConfig } from '../types';
import { STATE_VERSION, buildState } from '../config/seed';
import { dateKey } from '../lib/date';

type Listener = () => void;

let state: AppState | null = null;
let storageKey = '';
let configHash = '';
const listeners = new Set<Listener>();
const history: { label: string; snapshot: AppState }[] = [];
let saveTimer: number | undefined;

function hashConfig(cfg: DemoConfig): string {
  return JSON.stringify(cfg);
}

function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ configHash, state }));
    } catch {
      /* almacenamiento lleno o bloqueado: el demo sigue funcionando en memoria */
    }
  }, 150);
}

function emit() {
  listeners.forEach((l) => l());
}

/** Carga (o genera) el estado para un demo */
export function initStore(cfg: DemoConfig) {
  storageKey = `agenda-demo:${cfg.slug}`;
  configHash = hashConfig(cfg);
  const today = dateKey(new Date());
  let loaded: AppState | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { configHash: string; state: AppState };
      const s = parsed.state;
      const fresh = s.version === STATE_VERSION && parsed.configHash === configHash;
      // Si nadie tocó el demo, lo regeneramos cada día para que siempre esté "vivo"
      if (fresh && (s.dirty || s.seededOn === today)) loaded = s;
    }
  } catch {
    loaded = null;
  }
  state = loaded ?? buildState(cfg);
  history.length = 0;
  persist();
  emit();
}

export function resetDemo(cfg: DemoConfig) {
  state = buildState(cfg);
  history.length = 0;
  persist();
  emit();
}

export function getState(): AppState {
  if (!state) throw new Error('Store no inicializado');
  return state;
}

/** Aplica un cambio. `label` aparece en el aviso de "Deshacer". */
export function update(label: string, mutate: (draft: AppState) => void) {
  const prev = getState();
  const draft = structuredClone(prev);
  mutate(draft);
  draft.dirty = true;
  history.push({ label, snapshot: prev });
  if (history.length > 50) history.shift();
  state = draft;
  persist();
  emit();
}

export function canUndo() {
  return history.length > 0;
}

export function undo(): string | null {
  const h = history.pop();
  if (!h) return null;
  state = h.snapshot;
  persist();
  emit();
  return h.label;
}

export function replaceState(next: AppState) {
  history.push({ label: 'import', snapshot: getState() });
  state = { ...next, dirty: true };
  persist();
  emit();
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

let seq = Date.now() % 100000;
export function uid(prefix: string): string {
  return `${prefix}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
