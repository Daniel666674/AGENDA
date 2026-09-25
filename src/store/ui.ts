// Estado de interfaz: paneles abiertos, avisos (toasts) y modo claro/oscuro.
import { useSyncExternalStore } from 'react';

export interface ApptDraft {
  clientId?: string;
  staffId?: string | null;
  serviceId?: string;
  start?: string;
}

export interface Toast {
  id: number;
  text: string;
  undo?: boolean;
  tone?: 'default' | 'success' | 'online';
}

interface UIState {
  appt: { id?: string; draft?: ApptDraft } | null;
  clientId: string | null;
  clientEdit: { id?: string; name?: string; onCreated?: (id: string) => void } | null;
  palette: boolean;
  customizer: boolean;
  toasts: Toast[];
  mode: 'light' | 'dark' | null;
  highlight: string | null;
}

let ui: UIState = { appt: null, clientId: null, clientEdit: null, palette: false, customizer: false, toasts: [], mode: null, highlight: null };
const listeners = new Set<() => void>();

function set(patch: Partial<UIState>) {
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}

export const uiActions = {
  openAppointment: (id: string) => set({ appt: { id }, palette: false }),
  newAppointment: (draft: ApptDraft = {}) => set({ appt: { draft }, palette: false }),
  closeAppointment: () => set({ appt: null }),
  openClient: (id: string) => set({ clientId: id, palette: false }),
  closeClient: () => set({ clientId: null }),
  editClient: (opts: UIState['clientEdit']) => set({ clientEdit: opts }),
  closeClientEdit: () => set({ clientEdit: null }),
  setPalette: (open: boolean) => set({ palette: open }),
  setCustomizer: (open: boolean) => set({ customizer: open }),
  setMode: (mode: 'light' | 'dark') => set({ mode }),
  highlight: (id: string | null) => set({ highlight: id }),
  toast(text: string, opts: Omit<Toast, 'id' | 'text'> = {}) {
    const id = Date.now() + Math.random();
    set({ toasts: [...ui.toasts.slice(-2), { id, text, ...opts }] });
    setTimeout(() => set({ toasts: ui.toasts.filter((t) => t.id !== id) }), opts.undo ? 6000 : 3500);
  },
  dismissToast: (id: number) => set({ toasts: ui.toasts.filter((t) => t.id !== id) }),
};

export function useUI(): UIState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ui,
  );
}
