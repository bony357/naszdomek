import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Props {
  title: ReactNode;
  count?: number;
  children: ReactNode;
  level?: 1 | 2;
  defaultOpen?: boolean;
  right?: ReactNode;
}

export function Group({ title, count, children, level = 1, defaultOpen = true, right }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`group group-l${level}`}>
      <button className="group-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="group-title">{title}</span>
        {count !== undefined && <span className="group-count">{count}</span>}
        {right}
      </button>
      {open && <div className="group-body">{children}</div>}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
