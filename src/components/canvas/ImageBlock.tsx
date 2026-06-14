/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ImageBlock as ImageBlockType } from '../../types';
import { Trash2, Move, Scale } from 'lucide-react';

interface ImageBlockProps {
  key?: any;
  block: ImageBlockType;
  zoom: number;
  onUpdate: (id: string, updates: Partial<ImageBlockType>) => void;
  onDelete: (id: string) => void;
  isSelectToolActive: boolean;
}

export default function ImageBlock({
  block,
  zoom,
  onUpdate,
  onDelete,
  isSelectToolActive
}: ImageBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const blockRef = useRef<HTMLDivElement>(null);

  // Drag handlers
  const handleDragDown = (e: React.PointerEvent) => {
    setIsSelected(true);
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle')) return; // ignore resize trigger
    if (!target.closest('.drag-trigger') && !isSelectToolActive) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const rect = blockRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Resize handler
  const handleResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: block.width,
      height: block.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const parentCanvas = blockRef.current?.parentElement;
      if (!parentCanvas) return;
      const parentRect = parentCanvas.getBoundingClientRect();

      if (isDragging) {
        // Drag calculations
        const relativeX = (e.clientX - parentRect.left - dragOffset.x) / zoom;
        const relativeY = (e.clientY - parentRect.top - dragOffset.y) / zoom;
        onUpdate(block.id, {
          x: Math.max(0, relativeX),
          y: Math.max(0, relativeY)
        });
      }

      if (isResizing) {
        // Resize calculations
        const deltaX = (e.clientX - resizeStart.x) / zoom;
        const deltaY = (e.clientY - resizeStart.y) / zoom;
        onUpdate(block.id, {
          width: Math.max(40, resizeStart.width + deltaX),
          height: Math.max(40, resizeStart.height + deltaY)
        });
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, zoom, block.id, onUpdate]);

  return (
    <div
      ref={blockRef}
      onPointerDown={handleDragDown}
      className={`drag-trigger absolute group rounded-lg select-none border ${isSelected ? 'border-brand-primary z-30 ring-1 ring-brand-primary/50' : 'border-transparent hover:border-brand-primary z-20'}`}
      style={{
        left: block.x * zoom,
        top: block.y * zoom,
        width: block.width * zoom,
        height: block.height * zoom,
      }}
    >
      {/* Control Buttons (Top bar) */}
      <div className={`absolute -top-7 left-0 flex items-center bg-white border border-gray-200 shadow-sm rounded-lg p-0.5 space-x-1 z-30 transition-all duration-125 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          type="button"
          className="p-0.5 text-text-secondary hover:text-brand-primary rounded cursor-grab active:cursor-grabbing"
          title="Drag Image"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => { e.stopPropagation(); handleDragDown(e); }}
        >
          <Move size={11} />
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`absolute -top-3 -right-3 p-1.5 bg-white text-text-muted hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-full shadow-sm transition-all duration-150 z-30 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        title="Delete Image"
      >
        <Trash2 size={13} />
      </button>

      {/* Styled Image */}
      <img
        src={block.src}
        alt={block.alt || 'Inserted element'}
        className="w-full h-full object-cover rounded-lg pointer-events-none select-none"
        referrerPolicy="no-referrer"
      />

      {/* Resize Bottom Right Corner Handle */}
      <div
        onPointerDown={handleResizeDown}
        className={`resize-handle absolute bottom-1 right-1 w-5 h-5 bg-white border border-gray-200 shadow-sm rounded-lg flex items-center justify-center cursor-se-resize hover:text-brand-primary hover:scale-105 transition-all duration-110 select-none z-30 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        title="Resize Image"
      >
        <Scale size={10} className="transform rotate-90" />
      </div>
    </div>
  );
}
