import { ArrowLeft, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  /** otwarty "nad" innym arkuszem — pokaż strzałkę wstecz zamiast X */
  stacked?: boolean;
  /** przykryty przez kolejny arkusz (zachowuje stan, ale nie jest widoczny) */
  hidden?: boolean;
}

export interface SheetStackProps {
  stacked?: boolean;
  hidden?: boolean;
}

/** Arkusz od dołu (telefon) / okno dialogowe (desktop) */
export function Sheet({ title, onClose, children, footer, actions, stacked, hidden }: Props) {
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, hidden]);

  return (
    <div className={`sheet-backdrop ${hidden ? 'is-hidden' : ''} ${stacked ? 'is-stacked' : ''}`} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <button className="icon-btn" onClick={onClose} aria-label={stacked ? 'Wstecz' : 'Zamknij'}>
            {stacked ? <ArrowLeft size={22} /> : <X size={22} />}
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
