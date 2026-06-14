/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TextBlock as TextBlockType } from '../../types';
import { Trash2, Move, Edit2, Check, X, Maximize2 } from 'lucide-react';

interface TextBlockProps {
  key?: any;
  block: TextBlockType;
  zoom: number;
  onUpdate: (id: string, updates: Partial<TextBlockType>) => void;
  onDelete: (id: string) => void;
  isSelectToolActive: boolean;
}

export default function TextBlock({
  block,
  zoom,
  onUpdate,
  onDelete,
  isSelectToolActive
}: TextBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  const blockRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Focus-out handlers for inline styles editor
  const handleSave = () => {
    onUpdate(block.id, { content });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(block.content);
    setIsEditing(false);
  };

  // Dragging event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    
    // Check if dragging via handle or anywhere if select tool is on
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('.drag-handle');
    if (!isDragHandle && !isSelectToolActive) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = blockRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate offset based on actual viewport coordinates
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const parentCanvas = blockRef.current?.parentElement;
      if (!parentCanvas) return;
      const parentRect = parentCanvas.getBoundingClientRect();
      const relativeX = (e.clientX - parentRect.left) / zoom;
      const relativeY = (e.clientY - parentRect.top) / zoom;

      if (isDragging) {
        onUpdate(block.id, {
          x: Math.max(0, relativeX - dragOffset.x / zoom),
          y: Math.max(0, relativeY - dragOffset.y / zoom)
        });
      }

      if (isResizing) {
        const newWidth = Math.max(50, relativeX - block.x);
        onUpdate(block.id, { width: newWidth });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isResizing, dragOffset, zoom, block.id, block.x, block.y, onUpdate]);

  // Adjust fontSize options
  const changeFontSize = (delta: number) => {
    const size = Math.max(10, Math.min(block.fontSize + delta, 48));
    onUpdate(block.id, { fontSize: size });
  };

  return (
    <div
      ref={blockRef}
      className={`absolute select-none group border text-xs leading-normal ${
        isEditing 
          ? 'border-brand-primary bg-white shadow-lg p-3 z-30 rounded-xl' 
          : 'border-transparent hover:border-dashed hover:border-brand-primary/50 hover:bg-brand-light/20 p-2.5 z-20 rounded-xl'
      }`}
      style={{
        left: block.x * zoom,
        top: block.y * zoom,
        width: block.width * zoom,
        transformOrigin: 'top left',
        backgroundColor: isEditing ? '#FFFFFF' : 'transparent',
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
      }}
    >
      {/* Context Action Hover Box (Only shown when not editing) */}
      {!isEditing && (
        <>
          <div className="absolute -top-7.5 left-0 opacity-0 group-hover:opacity-100 flex items-center bg-white border border-gray-200 shadow-sm rounded-lg px-1.5 py-0.5 space-x-1.5 z-30 transition-all duration-150">
            <button
              type="button"
              className="drag-handle p-0.5 text-text-secondary hover:text-brand-primary rounded cursor-grab active:cursor-grabbing"
              title="Drag Text"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Move size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-0.5 text-text-secondary hover:text-brand-primary rounded"
              title="Edit Text"
            >
              <Edit2 size={11} />
            </button>
          </div>

          {/* Top Right Delete Button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-3 -right-3 p-1.5 bg-white text-text-muted hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-150 z-30"
            title="Delete Text Block"
          >
            <Trash2 size={13} />
          </button>

          {/* Right/Bottom Resize Handle */}
          <div
            onPointerDown={handleResizeDown}
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-white border border-gray-300 rounded cursor-ew-resize opacity-0 group-hover:opacity-100 shadow-sm z-30 hover:bg-brand-light flex items-center justify-center transition-all duration-150"
            title="Resize Width"
          >
           <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
          </div>
        </>
      )}

      {/* Editing Toolbar */}
      {isEditing && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 flex-wrap gap-1.5" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'max-content' }}>
          <div className="flex items-center space-x-1 bg-bg-secondary p-0.5 rounded">
            <button
              onClick={(e) => { e.stopPropagation(); changeFontSize(2); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 text-[10px] bg-white rounded shadow-xs font-bold hover:bg-bg-tertiary"
              title="Increase Font"
            >
              A+
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); changeFontSize(-2); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 text-[10px] bg-white rounded shadow-xs font-bold hover:bg-bg-tertiary"
              title="Decrease Font"
            >
              A-
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
              title="Apply Save"
            >
              <Check size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Text block Content section */}
      {isEditing ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={`outline-none min-h-[40px] text-text-primary overflow-wrap-break-word font-sans pr-1 select-text ${isEditing ? 'cursor-text' : ''}`}
          style={{ 
            fontSize: `${block.fontSize * zoom}px`,
            fontFamily: block.fontFamily,
            color: block.color
          }}
          onInput={(e) => setContent(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: block.content }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div 
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="text-text-primary overflow-wrap-break-word leading-relaxed font-sans cursor-pointer whitespace-pre-wrap select-text"
          style={{ 
            fontSize: `${block.fontSize * zoom}px`, 
            fontFamily: block.fontFamily,
            color: block.color
          }}
          onPointerDown={(e) => {
             e.stopPropagation();
             const now = Date.now();
             if (now - lastTapRef.current < 350) {
               setIsEditing(true);
               lastTapRef.current = 0; // reset
               return;
             }
             lastTapRef.current = now;
             handlePointerDown(e);
          }}
          dangerouslySetInnerHTML={{ __html: block.content || 'Double tap to write...' }}
        />
      )}
    </div>
  );
}
