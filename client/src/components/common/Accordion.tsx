import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface AccordionSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: string;
}

interface AccordionProps {
  sections: AccordionSection[];
  defaultOpen?: string[];
  allowMultiple?: boolean;
}

export default function Accordion({ sections, defaultOpen = [], allowMultiple = true }: AccordionProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(defaultOpen));

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isOpen = openSections.has(section.id);
        return (
          <div key={section.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="accordion-header"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                {section.icon}
                <span>{section.title}</span>
              </div>
              {section.badge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  {section.badge}
                </span>
              )}
            </button>
            <div
              className={clsx(
                'transition-all duration-200 overflow-hidden',
                isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="accordion-content pt-2">{section.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
