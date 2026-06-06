import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  width?: number;
  children: ReactNode;
}

export default function Drawer({ open, onClose, title, subtitle, footer, width = 480, children }: Props) {
  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'drawer-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`drawer ${open ? 'drawer--open' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer__header">
          <div className="drawer__title-block">
            <h2 id="drawer-title" className="drawer__title">{title}</h2>
            {subtitle && <div className="drawer__subtitle">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="drawer__close"
            aria-label="Close drawer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="drawer__body">
          {children}
        </div>
        {footer && <div className="drawer__footer">{footer}</div>}
      </aside>
    </>
  );
}
