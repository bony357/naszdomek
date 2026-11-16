import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
}

/** Arkusz od dołu (telefon) / okno dialogowe (desktop) */
export function Sheet({ title, onClose, children, footer, actions }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <button className="icon-btn" onClick={onClose} aria-label="Zamknij">
            <X size={22} />
          </button>
          <h2>{title}</h2>
          <div className="sheet-actions">{actions}</div>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-footer">{footer}</footer>}
      </div>
    </div>
  );
}
