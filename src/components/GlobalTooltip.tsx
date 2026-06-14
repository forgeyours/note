import React, { useEffect, useState } from 'react';

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    let timeout: number;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const elementWithTitle = target.closest('[title]') as HTMLElement;
      
      if (elementWithTitle) {
        const title = elementWithTitle.getAttribute('title');
        if (title) {
          elementWithTitle.setAttribute('data-tooltip', title);
          elementWithTitle.removeAttribute('title');
          
          const rect = elementWithTitle.getBoundingClientRect();
          setTooltip({
            text: title,
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8,
          });
        }
      } else {
        const elementWithDataTooltip = target.closest('[data-tooltip]') as HTMLElement;
        if (elementWithDataTooltip) {
           const rect = elementWithDataTooltip.getBoundingClientRect();
           setTooltip({
             text: elementWithDataTooltip.getAttribute('data-tooltip')!,
             x: rect.left + rect.width / 2,
             y: rect.bottom + 8,
           });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement;
      
      // If we're just moving between children of the tooltip container, ignore
      const elementWithDataTooltip = target.closest('[data-tooltip]') as HTMLElement;
      if (elementWithDataTooltip && related && elementWithDataTooltip.contains(related)) {
         return;
      }
      
      setTooltip(null);
    };

    const handleMouseDown = () => setTooltip(null);

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div 
      className="fixed z-[99999] pointer-events-none px-2.5 py-1.5 bg-gray-900/95 dark:bg-black text-white text-[11px] font-semibold tracking-wide rounded shadow-md whitespace-nowrap transform -translate-x-1/2 animate-fade-in"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      {tooltip.text}
    </div>
  );
}
