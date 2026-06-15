/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { Pen, Highlighter, Trash2, Star, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { FavoriteCombination } from '../../types';

export default function FavoritePensToolbar() {
  const store = useAppStore();
  const notebookId = store.activeNotebookId;
  const pageId = store.activePageId;

  // Interaction tracking state
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<FavoriteCombination | null>(null);
  const [draggedOffset, setDraggedOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const trashRef = useRef<HTMLDivElement | null>(null);

  // Render only if we have an active notebook and page
  if (!notebookId || !pageId) return null;

  const favorites = store.notebookFavorites[notebookId] || [];

  // Cancel the long hold timer
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    item: FavoriteCombination,
    index: number
  ) => {
    // Only track primary clicks / pointer taps
    const isTouch = e.pointerType === 'touch';
    if (!isTouch && e.button !== 0) return;

    e.stopPropagation(); // Stop propagation to prevent drawing on the canvas underneath!

    const startX = e.clientX;
    const startY = e.clientY;
    startPosRef.current = { x: startX, y: startY };

    setPressedIndex(index);
    setIsLongPressed(false);
    setMousePos({ x: startX, y: startY });

    const elem = e.currentTarget.getBoundingClientRect();
    setDraggedOffset({
      x: startX - (elem.left + elem.width / 2),
      y: startY - (elem.top + elem.height / 2),
    });

    // Start snappy long-press timer (400ms)
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressed(true);
      setDraggedItem(item);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(30); // Gentle feedback
        } catch (_) {}
      }
      toast('Long-hold active! Drag up/down to reorder, or to trash region at the bottom to delete.', {
        icon: '🔔',
        id: 'drag-notice',
        duration: 2000,
      });
    }, 400);

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Stop propagation to prevent drawing on the canvas underneath!
    if (pressedIndex === null) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    setMousePos({ x: currentX, y: currentY });

    // If we haven't reached long-press state yet, measure distance
    if (!isLongPressed) {
      const distance = Math.hypot(currentX - startPosRef.current.x, currentY - startPosRef.current.y);
      // Increased wiggle tolerance to 24px so fingers can rest stable without cancelling
      if (distance > 24) {
        cancelLongPress();
      }
    } else {
      // We are dragging, evaluate collision with bottom middle trash area first
      let over = false;
      if (trashRef.current) {
        const rect = trashRef.current.getBoundingClientRect();
        over = (
          currentX >= rect.left &&
          currentX <= rect.right &&
          currentY >= rect.top &&
          currentY <= rect.bottom
        );
      } else {
        // Fallback boundary
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        over = (
          currentX >= screenWidth / 2 - 120 &&
          currentX <= screenWidth / 2 + 120 &&
          currentY >= screenHeight - 140
        );
      }
      setIsOverTrash(over);

      // Real-time reordering when not hovered over the trash can!
      if (!over) {
        const elemBelow = document.elementFromPoint(currentX, currentY);
        if (elemBelow) {
          const favButton = elemBelow.closest('[data-fav-index]');
          if (favButton) {
            const targetIndex = parseInt(favButton.getAttribute('data-fav-index') || '-1', 10);
            if (targetIndex !== -1 && targetIndex !== pressedIndex) {
              store.reorderFavorites(notebookId, pressedIndex, targetIndex);
              setPressedIndex(targetIndex);
              
              if (navigator.vibrate) {
                try {
                  navigator.vibrate(12); // Subtle haptic notification of swapping
                } catch (_) {}
              }
            }
          }
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>, item: FavoriteCombination) => {
    e.stopPropagation(); // Stop propagation to prevent drawing on the canvas underneath!
    cancelLongPress();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const isDraggingActive = isLongPressed;
    const clickIdx = pressedIndex;

    // Reset interaction track state
    setPressedIndex(null);
    setDraggedItem(null);
    setIsLongPressed(false);

    if (isDraggingActive) {
      if (isOverTrash) {
        store.removeFavorite(notebookId, item.id);
        toast.error('Favorite preset deleted!', {
          icon: '🗑️',
        });
      }
      setIsOverTrash(false);
      return;
    }

    // Otherwise, this was a regular tap! Execute brush speed-setting
    if (clickIdx !== null) {
      store.setTool(item.type);
      if (item.type === 'pen') {
        store.setPenColor(item.color);
        store.setPenWidth(item.width);
        if (item.brushType) {
          store.setBrushType(item.brushType);
        }
        toast.success(`Active pen loaded: Color ${item.color} (${item.width}px)`, { id: 'brush-switch-toast' });
      } else {
        store.setHighlightColor(item.color);
        store.setHighlightWidth(item.width);
        toast.success(`Active marker loaded: Color ${item.color} (${item.width}px)`, { id: 'brush-switch-toast' });
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Stop propagation to prevent drawing on the canvas underneath!
    cancelLongPress();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setPressedIndex(null);
    setDraggedItem(null);
    setIsLongPressed(false);
    setIsOverTrash(false);
  };

  return (
    <>
      {/* Floating vertical sidebar dock */}
      <div 
        className="fixed right-4 top-[170px] z-45 flex flex-col items-center p-2 rounded-2xl bg-white/80 dark:bg-[#1E2028]/80 backdrop-blur-md border border-gray-150 dark:border-gray-800 shadow-xl select-none touch-none"
        id="favorites-dock-rail"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pb-2 mb-2 border-b border-gray-100 dark:border-gray-800/80 font-sans pointer-events-none">
          <Star size={13} className="text-amber-500 fill-amber-400" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted mt-1">Favs</span>
        </div>

        {favorites.length === 0 ? (
          <div className="w-10 py-5 flex flex-col items-center justify-center text-center opacity-40 font-sans">
            <span className="text-[9px] font-bold text-gray-400 leading-none">EMPTY</span>
            <span className="text-[7px] text-gray-400 mt-1 scale-90">Add via picker</span>
          </div>
        ) : (
          <div className="flex flex-col space-y-2.5">
            {favorites.map((item, index) => {
              const isActive = pressedIndex === index;
              const isPen = item.type === 'pen';

              // Visual highlight helper for currently selected pen configuration
              const isCurrentlyActive = isPen 
                ? (store.activeTool === 'pen' && store.penColor.toLowerCase() === item.color.toLowerCase() && store.penWidth === item.width)
                : (store.activeTool === 'highlighter' && store.highlightColor.toLowerCase() === item.color.toLowerCase() && store.highlightWidth === item.width);

              return (
                <button
                  key={item.id}
                  data-fav-index={index}
                  onPointerDown={(e) => handlePointerDown(e, item, index)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(e, item)}
                  onPointerCancel={handlePointerCancel}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'none'
                  }}
                  className={`w-[48px] h-[48px] touch-none flex flex-col items-center justify-center rounded-xl transition-all cursor-grab active:cursor-grabbing relative border ${
                    isLongPressed && isActive
                      ? 'opacity-35 scale-90 border-dashed border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : isCurrentlyActive
                        ? 'bg-[#F0F2FF] dark:bg-[#1C1F33] border-indigo-500/50 shadow-md ring-2 ring-indigo-500/20 scale-[1.05]'
                        : 'bg-white dark:bg-[#12131A] dark:border-gray-850 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  title={`${isPen ? 'Pen' : 'Highlighter'} (${item.width}px) - Long-hold & drag to reorder or to custom trash at bottom middle to remove`}
                >
                  {/* Miniature tip container */}
                  <div className="relative flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: item.color + '15' }}>
                    {isPen ? (
                      <Pen size={14} className="transform rotate-270" style={{ color: item.color }} />
                    ) : (
                      <Highlighter size={14} className="transform rotate-45" style={{ color: item.color }} />
                    )}
                    {/* Brush type visual overlays */}
                    {isPen && item.brushType && item.brushType !== 'normal' && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" title={item.brushType} />
                    )}
                  </div>

                  <span className="text-[9px] font-bold font-mono text-gray-500 dark:text-gray-400 mt-1 tracking-tighter">
                    {item.width}px
                  </span>

                  {isCurrentlyActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-2" />
        <span className="text-[7px] text-gray-400 dark:text-gray-500 text-center font-bold tracking-tight scale-90">
          Max 7
        </span>
      </div>

      {/* Dragging Visual Clone Follower */}
      {isLongPressed && draggedItem && (
        <div
          className={`fixed pointer-events-none z-[9999] flex items-center space-x-2 px-3 py-2 bg-[#FAF9F6] dark:bg-[#1E2028] border-2 rounded-2xl shadow-2xl scale-110 cursor-grabbing transition-colors duration-150 ${
            isOverTrash 
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
              : 'border-[#4f46e5]'
          }`}
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            transform: 'translate(-50%, -50%) scale(1.1)',
          }}
        >
          <GripVertical size={13} className="text-gray-400" />
          {draggedItem.type === 'pen' ? (
            <Pen size={14} style={{ color: draggedItem.color }} />
          ) : (
            <Highlighter size={14} style={{ color: draggedItem.color }} />
          )}
          <span className="text-xs font-bold font-mono text-gray-700 dark:text-gray-300">
            {draggedItem.width}px
          </span>
        </div>
      )}

      {/* Floating Bottom-Middle Drop/Trash Region */}
      {isLongPressed && (
        <div
          ref={trashRef}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] px-7 py-4 rounded-3xl border-2 flex flex-col items-center justify-center space-y-1.5 shadow-2xl transition-all duration-300 pointer-events-none ${
            isOverTrash
              ? 'bg-red-500/15 border-red-500 text-red-500 scale-110 shadow-red-500/20'
              : 'bg-[#FAF9F6] dark:bg-[#1A1C24] border-gray-200 dark:border-[#2C2E3C] text-text-muted dark:text-gray-400 scale-100'
          }`}
        >
          <div
            className={`p-2.5 rounded-full transition-all duration-200 ${
              isOverTrash 
                ? 'bg-red-50 text-white animate-bounce shadow-xl' 
                : 'bg-red-50 dark:bg-red-950/20 text-red-500'
            }`}
          >
            <Trash2 size={24} className={isOverTrash ? 'scale-110 animate-pulse' : 'scale-100'} />
          </div>
          <div className="text-[11px] font-bold font-sans tracking-wide">
            {isOverTrash ? 'RELEASE TO REMOVE FAVORITE!' : 'Drag item here to delete'}
          </div>
        </div>
      )}
    </>
  );
}
