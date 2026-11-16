import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Props {
  title: ReactNode;
  count?: number;
  children: ReactNode;
  level?: 1 | 2;
  defaultOpen?: boolean;
  right?: ReactNode;
}

/**
 * Poziom 1: osobna karta z wyraźnym nagłówkiem.
 * Poziom 2: podsekcja wewnątrz karty, z wcięciem i linią po lewej.
 */
export function Group({ title, count, children, level = 1, defaultOpen = true, right }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`group group-l${level} ${open ? 'open' : 'closed'}`}>
      <div className="group-header">
        <button className="group-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronDown size={level === 1 ? 18 : 16} className="chev" />
          <span className="group-title">{title}</span>
          {count !== undefined && <span className="group-count">{count}</span>}
        </button>
        {right}
      </div>
      {open && <div className="group-body">{children}</div>}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
