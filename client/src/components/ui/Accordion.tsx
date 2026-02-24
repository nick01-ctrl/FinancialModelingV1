import { useState, ReactNode } from 'react';
import './accordion.css';

interface AccordionSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  sections: AccordionSection[];
  defaultOpen?: string[];
}

export default function Accordion({ sections, defaultOpen = [] }: AccordionProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(defaultOpen.length > 0 ? defaultOpen : [sections[0]?.id])
  );

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="accordion">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`accordion-item ${openSections.has(section.id) ? 'open' : ''}`}
        >
          <button
            className="accordion-trigger"
            onClick={() => toggle(section.id)}
            aria-expanded={openSections.has(section.id)}
          >
            <span className="accordion-title">{section.title}</span>
            <span className="accordion-icon">
              {openSections.has(section.id) ? '−' : '+'}
            </span>
          </button>
          {openSections.has(section.id) && (
            <div className="accordion-content">{section.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}
