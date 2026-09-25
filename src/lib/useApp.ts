// Hook principal: estado + traducción + formateo según el negocio.
import { useMemo } from 'react';
import type { AppState, Status } from '../types';
import { useAppState } from '../store/store';
import { translate, type TKey } from '../i18n';
import { PRESETS, pick } from '../config/presets';
import { hm, parseLocal } from './date';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function makeHelpers(s: AppState) {
  const b = s.business;
  const lang = b.lang;
  const preset = PRESETS[b.type] ?? PRESETS.generic;
  const nouns = {
    client: pick(preset.client, lang).toLowerCase(),
    clients: pick(preset.clients, lang).toLowerCase(),
    Client: cap(pick(preset.client, lang)),
    Clients: cap(pick(preset.clients, lang)),
    staff: pick(preset.staffNoun, lang).toLowerCase(),
    Staff: cap(pick(preset.staffNoun, lang)),
  };
  const t = (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, { ...nouns, ...vars });

  const money = new Intl.NumberFormat(b.locale, { style: 'currency', currency: b.currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
  const num1 = new Intl.NumberFormat(b.locale, { maximumFractionDigits: 1 });
  const sym = money.formatToParts(0).find((p) => p.type === 'currency')?.value ?? '$';
  const symbol = sym.length > 1 ? sym + ' ' : sym;
  /** Formato corto legible: $21,030 · $1.2M · $850k (sólo abrevia cifras grandes) */
  const short = (n: number) => {
    const a = Math.abs(n);
    if (a >= 1e6) return `${symbol}${num1.format(n / 1e6)}M`;
    if (a >= 1e5) return `${symbol}${num1.format(Math.round(n / 1e3))}k`;
    return money.format(n);
  };

  const time = (minutes: number) => {
    if (b.timeFormat === '24h') return hm(minutes);
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const suffix = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
  };
  const timeOf = (local: string) => {
    const d = parseLocal(local);
    return time(d.getHours() * 60 + d.getMinutes());
  };
  const dateFmt = (d: Date, opts: Intl.DateTimeFormatOptions) => cap(new Intl.DateTimeFormat(b.locale, opts).format(d));

  return {
    t,
    lang,
    preset,
    nouns,
    money: (n: number) => money.format(n),
    moneyShort: short,
    time,
    timeOf,
    date: dateFmt,
    longDate: (d: Date) => dateFmt(d, { weekday: 'long', day: 'numeric', month: 'long' }),
    shortDate: (d: Date) => dateFmt(d, { weekday: 'short', day: 'numeric', month: 'short' }),
    weekdaysShort: t('weekdays_short').split(','),
    weekdaysLong: t('weekdays_long').split(','),
    status: (st: Status) => t(`st_${st}` as TKey),
    duration: (n: number) => (n < 60 ? `${n} min` : `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ''}`),
  };
}

export type Helpers = ReturnType<typeof makeHelpers>;

export function useApp() {
  const s = useAppState();
  const h = useMemo(() => makeHelpers(s), [s.business]);
  return { s, ...h };
}
