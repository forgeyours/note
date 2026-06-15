import React, { useEffect, useState, useRef } from 'react';

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const dismissedRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!tooltip) return;

    const autoDismissTimer = setTimeout(() => {
      setTooltip(null);
      dismissedRef.current = true;
    }, 1500);

    return () => clearTimeout(autoDismissTimer);
  }, [tooltip]);

  useEffect(() => {
    // Basic media query lookup for hovering capability
    const hasHoverSupport = window.matchMedia('(hover: hover)').matches;

    const handleTouchStart = () => {
      lastTouchTimeRef.current = Date.now();
      // Dismiss any current tooltip on touch input
      setTooltip(null);
      dismissedRef.current = true;
    };

    const handleMouseOver = (e: MouseEvent) => {
      // 1. Fully bypass tooltips on devices that do not support hover states (e.g. phones/tablets)
      if (!hasHoverSupport) return;

      // 2. Prevent touch-triggered mouseover events (typically fire immediately after a touch tap)
      if (Date.now() - lastTouchTimeRef.current < 2000) {
        return;
      }

      const target = e.target as HTMLElement;
      let element = target.closest('[title]') as HTMLElement;
      let titleText = '';

      if (element) {
        const title = element.getAttribute('title');
        if (title) {
          element.setAttribute('data-tooltip', title);
          element.removeAttribute('title');
          titleText = title;
        }
      } else {
        element = target.closest('[data-tooltip]') as HTMLElement;
        if (element) {
          titleText = element.getAttribute('data-tooltip') || '';
        }
      }

      if (!element) {
        if (hoveredElementRef.current) {
          hoveredElementRef.current = null;
          dismissedRef.current = false;
          setTooltip(null);
        }
        return;
      }

      if (hoveredElementRef.current === element) {
        if (dismissedRef.current) {
          return;
        }
        return;
      }

      hoveredElementRef.current = element;
      dismissedRef.current = false;

      const rect = element.getBoundingClientRect();
      setTooltip({
        text: titleText,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement;
      
      if (hoveredElementRef.current) {
        if (!related || !hoveredElementRef.current.contains(related)) {
          setTooltip(null);
          hoveredElementRef.current = null;
          dismissedRef.current = false;
        }
      }
    };

    const handleMouseDown = () => {
      setTooltip(null);
      dismissedRef.current = true;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
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
