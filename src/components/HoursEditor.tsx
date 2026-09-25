import type { WeekHours } from '../types';
import { useApp } from '../lib/useApp';
import { Toggle, cx } from './ui';

/** Editor de horario semanal con descanso opcional */
export function HoursEditor({ value, onChange }: { value: WeekHours; onChange: (v: WeekHours) => void }) {
  const { s, t, weekdaysLong } = useApp();
  const order = s.business.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const set = (i: number, patch: Partial<WeekHours[number]>) => onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className="hours">
      {order.map((i) => {
        const d = value[i];
        const hasBreak = !!(d.breakStart && d.breakEnd);
        return (
          <div key={i} className={cx('hours-row', !d.open && 'off')}>
            <span className="hours-day">{weekdaysLong[i]}</span>
            <Toggle checked={d.open} onChange={(open) => set(i, { open })} />
            {d.open ? (
              <div className="hours-times">
                <input type="time" value={d.start} onChange={(e) => set(i, { start: e.target.value })} />
                <span className="muted">–</span>
                <input type="time" value={d.end} onChange={(e) => set(i, { end: e.target.value })} />
                <button
                  type="button"
                  className={cx('chip', hasBreak && 'on')}
                  onClick={() => set(i, hasBreak ? { breakStart: undefined, breakEnd: undefined } : { breakStart: '14:00', breakEnd: '15:00' })}
                >
                  {hasBreak ? t('break') : `+ ${t('break')}`}
                </button>
                {hasBreak && (
                  <>
                    <input type="time" value={d.breakStart} onChange={(e) => set(i, { breakStart: e.target.value })} />
                    <span className="muted">–</span>
                    <input type="time" value={d.breakEnd} onChange={(e) => set(i, { breakEnd: e.target.value })} />
                  </>
                )}
              </div>
            ) : (
              <span className="muted small">{t('closed')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
