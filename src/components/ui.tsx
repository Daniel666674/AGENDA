// Componentes base reutilizables
import { useEffect, useRef, type ReactNode } from 'react';
import type { Status } from '../types';
import { Icon, type IconName } from './Icon';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
};

export function Button({ variant = 'soft', size = 'md', icon, iconRight, className, children, ...rest }: BtnProps) {
  return (
    <button {...rest} className={cx('btn', `btn-${variant}`, `btn-${size}`, !children && 'btn-icon', className)}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

export function useEscape(fn: () => void, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && ref.current();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active]);
}

export function Drawer({ open, onClose, children, width = 480, title, subtitle, footer, accent }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; title?: ReactNode; subtitle?: ReactNode; footer?: ReactNode; accent?: string }) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" style={{ width, ['--item' as string]: accent }} role="dialog" aria-modal>
        {(title || subtitle) && (
          <header className="drawer-head">
            {accent && <span className="drawer-accent" />}
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p className="muted">{subtitle}</p>}
            </div>
            <Button variant="ghost" icon="x" onClick={onClose} aria-label="close" />
          </header>
        )}
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Modal({ open, onClose, children, title, footer, width = 520 }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <div className="overlay center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-modal>
        {title && (
          <header className="modal-head">
            <h2>{title}</h2>
            <Button variant="ghost" icon="x" onClick={onClose} aria-label="close" />
          </header>
        )}
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={cx('segmented', size === 'sm' && 'segmented-sm')} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={cx(o.value === value && 'on')} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function initials(name: string): string {
  const parts = name.replace(/^(Dra?\.|Dr\.|Coach)\s+/i, '').replace(/["“”].*?["“”]\s*/g, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ name, color, photo, size = 32, ring }: { name: string; color?: string; photo?: string; size?: number; ring?: boolean }) {
  return (
    <span className={cx('avatar', ring && 'avatar-ring')} style={{ width: size, height: size, fontSize: size * 0.38, ['--item' as string]: color ?? 'var(--accent)' }} title={name}>
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  );
}

export function StatusPill({ status, label }: { status: Status; label: string }) {
  return (
    <span className={cx('pill', `st-${status}`)}>
      <span className="pill-dot" />
      {label}
    </span>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export function Card({ title, action, children, className, pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && (
        <header className="card-head">
          <h3>{title}</h3>
          {action}
        </header>
      )}
      <div className={cx(pad && 'card-body')}>{children}</div>
    </section>
  );
}

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

export function ColorDots({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div className="color-dots">
      {colors.map((c) => (
        <button key={c} type="button" className={cx('color-dot', c === value && 'on')} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
      <label className="color-dot color-custom" style={{ background: colors.includes(value) ? undefined : value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <Icon name="plus" size={12} />
      </label>
    </div>
  );
}
