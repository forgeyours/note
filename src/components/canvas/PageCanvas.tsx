/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import HandwritingLayer from './HandwritingLayer';
import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import PDFBackground from './PDFBackground';
import { Page, ShapeBlock, Stroke } from '../../types';
import { Move, Trash2, Maximize2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { listPages } from '../../lib/db';
import { drawStrokes } from '../../lib/canvasEngine';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface StaticPageSheetProps {
  key?: string | number;
  page: Page;
  pdfSource?: string | null;
  zoom: number;
  darkMode: boolean;
  onActivate: (pageId: string) => void | Promise<void>;
}

const StaticPageSheet = memo(function StaticPageSheet({ page, pdfSource, zoom, darkMode, onActivate }: StaticPageSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const PAGE_HEIGHT = 1130;
  
  const strokes = useMemo(() => {
    try {
      return page.canvasData ? JSON.parse(page.canvasData) : [];
    } catch (e) {
      console.error("Failed to parse static page canvas data", e);
      return [];
    }
  }, [page.canvasData]);

  // Calculate pagesCount based on strokes/blocks of this specific page
  let maxY = 0;
  strokes.forEach(s => s.points.forEach(p => maxY = Math.max(maxY, p.y)));
  (page.textBlocks || []).forEach(t => maxY = Math.max(maxY, t.y + 100));
  (page.imageBlocks || []).forEach(i => maxY = Math.max(maxY, i.y + i.height));
  (page.shapeBlocks || []).forEach(s => maxY = Math.max(maxY, s.y + s.height));
  const pagesCount = Math.max(1, Math.ceil((maxY + 400) / PAGE_HEIGHT));

  const totalHeight = pagesCount * PAGE_HEIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '500px', // Pre-load 500px before scrolling into view for a seamless feel
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 800 * zoom * dpr;
    canvas.height = totalHeight * zoom * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 800 * zoom, totalHeight * zoom);

    drawStrokes(ctx, strokes, { scale: zoom, darkMode });
  }, [strokes, zoom, darkMode, totalHeight, isVisible]);

  const getBackgroundClass = () => {
    const bg = page.background;
    if (bg === 'ruled') return 'bg-ruled-pattern';
    if (bg === 'grid') return 'bg-grid-pattern';
    if (bg === 'dotted') return 'bg-dotted-pattern';
    return 'bg-white';
  };

  return (
    <div 
      ref={containerRef}
      onPointerDown={() => onActivate(page.id)}
      className="relative shrink-0 shadow-md border border-gray-200 dark:border-[#2E303B] rounded bg-white hover:border-brand-primary cursor-pointer group transition-all"
      style={{
        width: `${800 * zoom}px`,
        height: `${totalHeight * zoom}px`,
      }}
    >
      {isVisible ? (
        <>
          {/* Background papers for visual pages count */}
          {Array.from({ length: pagesCount }).map((_, i) => (
            <div
              key={`static-bg-${i}`}
              className={`absolute left-0 w-full pointer-events-none rounded ${getBackgroundClass()}`}
              style={{
                top: i * PAGE_HEIGHT * zoom,
                height: (PAGE_HEIGHT - 20) * zoom,
                backgroundColor: darkMode ? '#1A1C24' : 'var(--color-bg-primary)',
                zIndex: 0
              }}
            >
              <div className="absolute bottom-4 left-0 w-full text-center text-gray-400 dark:text-gray-600 font-sans text-xs font-semibold tracking-widest leading-none select-none">
                - Page {page.pageNumber || 1} ({i + 1}/{pagesCount}) -
              </div>
            </div>
          ))}

          {/* PDF Background if any */}
          {page.background === 'pdf' && (
            <PDFBackground 
              pdfSource={pdfSource} 
              zoom={zoom} 
              pdfPage={page.pdfPage} 
            />
          )}

          {/* Render Static Strokes Canvas */}
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              width: `${800 * zoom}px`,
              height: `${totalHeight * zoom}px`,
            }}
          />

          {/* Render Static Text Blocks */}
          {(page.textBlocks || []).map((block) => (
            <div
              key={block.id}
              className="absolute select-none pointer-events-none"
              style={{
                left: block.x * zoom,
                top: block.y * zoom,
                width: block.width * zoom,
                fontSize: `${(block.fontSize || 14) * zoom}px`,
                fontFamily: block.fontFamily || 'Inter',
                color: block.color || '#1A1D23',
                zIndex: 12
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>
          ))}

          {/* Render Static Image Blocks */}
          {(page.imageBlocks || []).map((img) => (
            <div
              key={img.id}
              className="absolute select-none pointer-events-none border border-transparent z-15"
              style={{
                left: img.x * zoom,
                top: img.y * zoom,
                width: img.width * zoom,
                height: img.height * zoom,
              }}
            >
              <img 
                src={img.src} 
                alt="Page resource block static" 
                className="w-full h-full object-cover rounded-md" 
                referrerPolicy="no-referrer"
              />
            </div>
          ))}

          {/* Render Static Shape Blocks */}
          {(page.shapeBlocks || []).map((shape) => {
            const rectWidth = shape.width * zoom;
            const rectHeight = shape.height * zoom;
            return (
              <div
                key={shape.id}
                className="absolute rounded pointer-events-none z-10"
                style={{
                  left: shape.x * zoom,
                  top: shape.y * zoom,
                  width: rectWidth,
                  height: rectHeight,
                }}
              >
                <svg className="w-full h-full overflow-visible">
                  {shape.type === 'rectangle' && (
                    <rect
                      x={0}
                      y={0}
                      width="100%"
                      height="100%"
                      fill={shape.fillColor || 'transparent'}
                      stroke={shape.borderColor}
                      strokeWidth={shape.borderWidth * zoom}
                    />
                  )}
                  {shape.type === 'circle' && (
                    <ellipse
                      cx="50%"
                      cy="50%"
                      rx="45%"
                      ry="45%"
                      fill={shape.fillColor || 'transparent'}
                      stroke={shape.borderColor}
                      strokeWidth={shape.borderWidth * zoom}
                    />
                  )}
                  {shape.type === 'triangle' && (
                    <polygon
                      points={`${rectWidth / 2},0 ${rectWidth},${rectHeight} 0,${rectHeight}`}
                      fill={shape.fillColor || 'transparent'}
                      stroke={shape.borderColor}
                      strokeWidth={shape.borderWidth * zoom}
                    />
                  )}
                  {shape.type === 'line' && (
                    <line
                      x1={shape.isFlipX ? "100%" : "0"}
                      y1={shape.isFlipY ? "100%" : "0"}
                      x2={shape.isFlipX ? "0" : "100%"}
                      y2={shape.isFlipY ? "0" : "100%"}
                      stroke={shape.borderColor}
                      strokeWidth={shape.borderWidth * zoom}
                    />
                  )}
                  {shape.type === 'arrow' && (
                    <>
                      <defs>
                        <marker
                          id={`arrow-static-${shape.id}`}
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <polygon points="0 0, 10 3.5, 0 7" fill={shape.borderColor} />
                        </marker>
                      </defs>
                      <line
                        x1={shape.isFlipX ? "100%" : "0"}
                        y1={shape.isFlipY ? "100%" : "0"}
                        x2={shape.isFlipX ? "0" : "100%"}
                        y2={shape.isFlipY ? "0" : "100%"}
                        stroke={shape.borderColor}
                        strokeWidth={shape.borderWidth * zoom}
                        markerEnd={`url(#arrow-static-${shape.id})`}
                      />
                    </>
                  )}
                </svg>
              </div>
            );
          })}

          {/* Quick hover border overlay */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-brand-primary text-white text-[10px] font-bold rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20">
            Page {page.pageNumber || 1} - Edit Page
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1A1C24] rounded border border-gray-100 dark:border-gray-800">
          <div className="text-center text-text-muted dark:text-gray-500 font-sans text-xs py-12 flex flex-col items-center">
            <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading page {page.pageNumber || 1} context...</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default function PageCanvas() {
  const store = useAppStore();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Memoized page activation for performance stabilization
  const handlePageActivate = useCallback((pageId: string) => {
    store.setActivePageId(pageId);
  }, [store.setActivePageId]);

  // Memoized stroke drawing handlers for performance stabilization
  const handleStrokeEnd = useCallback((f: Stroke) => {
    store.addStroke(f);
  }, [store.addStroke]);

  const handleStrokesChange = useCallback((strokes: Stroke[]) => {
    store.setStrokes(strokes);
  }, [store.setStrokes]);

  // Shape drawing state variables
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });
  const [tempShape, setTempShape] = useState<ShapeBlock | null>(null);

  // Shape drag/resize state
  const [movingShapeId, setMovingShapeId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [shapeDragOffset, setShapeDragOffset] = useState({ x: 0, y: 0 });

  // Lasso select states
  const [isLassoActive, setIsLassoActive] = useState(false);
  const [lassoStart, setLassoStart] = useState({ x: 0, y: 0 });
  const [lassoCurrent, setLassoCurrent] = useState({ x: 0, y: 0 });
  const lassoInitialSelectedIdsRef = useRef<string[]>([]);

  // Resizing state
  const [resizingShapeId, setResizingShapeId] = useState<string | null>(null);
  const [shapeResizeStart, setShapeResizeStart] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  const hasPage = store.activePageId !== null;

  // Add a text block on tap (if tool is 'text')
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasPage) return;
    
    const target = e.target as HTMLElement;
    
    // Clear selection if clicking directly on the canvas background
    if (target.classList.contains('canvas-backdrop') || target.tagName === 'svg') {
      setSelectedShapeId(null);
      setSelectedShapeIds([]);
    }

    if (store.activeTool !== 'text') return;

    // Check if clicked directly on canvas, not inside blocks
    const backdrop = target.closest('.canvas-backdrop');
    if (!backdrop) return;

    const rect = backdrop.getBoundingClientRect();

    // Calculate relative coordinates with zoom
    const x = (e.clientX - rect.left) / store.zoom;
    const y = (e.clientY - rect.top) / store.zoom;

    const newBlock = {
      id: `text-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x,
      y: y - 20, // offset slightly
      width: 280,
      content: 'Double tap to edit rich text...',
      fontSize: 14,
      fontFamily: 'Inter',
      color: '#1A1D23'
    };

    store.addTextBlock(newBlock);
    store.setTool('select'); // automatically switch to select to allow dragging
    toast.success('Text block added! Double click to edit styles.');
  };

  // Custom Shape drawing gestures & Lasso selections
  const handleShapePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasPage) return;
    const target = e.target as HTMLElement;

    // Check click target. If clicking on text, button, handles etc, ignore backdrop events
    if (target.closest('.drag-trigger') || target.closest('button') || target.closest('.resize-handle') || target.closest('input') || target.closest('textarea')) {
      return;
    }

    const backdrop = target.closest('.canvas-backdrop');
    if (!backdrop) return;

    const rect = backdrop.getBoundingClientRect();
    const x = (e.clientX - rect.left) / store.zoom;
    const y = (e.clientY - rect.top) / store.zoom;

    if (store.activeTool === 'shape') {
      e.preventDefault();
      setIsDrawingShape(true);
      setShapeStart({ x, y });

      const newShape: ShapeBlock = {
        id: `shape-temp`,
        type: store.activeShapeType,
        x,
        y,
        width: 0,
        height: 0,
        fillColor: 'transparent',
        borderColor: store.penColor,
        borderWidth: store.penWidth
      };
      setTempShape(newShape);
    } else if (store.activeTool === 'select') {
      // If we clicked directly on the background (backdrop or static SVG etc) and NOT on a shape block
      const clickedOnShape = target.closest('.shape-block-item');
      if (!clickedOnShape) {
        e.preventDefault();
        setIsLassoActive(true);
        setLassoStart({ x, y });
        setLassoCurrent({ x, y });
        
        // Save initial selected ids
        const initialSaved = (e.shiftKey || e.metaKey) ? [...selectedShapeIds] : [];
        lassoInitialSelectedIdsRef.current = initialSaved;

        // Clear selection unless shift / cmd is held
        if (!e.shiftKey && !e.metaKey) {
          setSelectedShapeId(null);
          setSelectedShapeIds([]);
        }
      }
    }
  };

  const handleShapePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawingShape && tempShape) {
      const target = e.target as HTMLElement;
      const backdrop = target.closest('.canvas-backdrop') || canvasContainerRef.current?.querySelector('.canvas-backdrop');
      if (!backdrop) return;
      const rect = backdrop.getBoundingClientRect();

      const x = (e.clientX - rect.left) / store.zoom;
      const y = (e.clientY - rect.top) / store.zoom;

      // Math calculation for bounds
      const width = x - shapeStart.x;
      const height = y - shapeStart.y;

      const xPos = width >= 0 ? shapeStart.x : x;
      const yPos = height >= 0 ? shapeStart.y : y;

      setTempShape({
        ...tempShape,
        x: xPos,
        y: yPos,
        width: Math.abs(width),
        height: Math.abs(height),
        isFlipX: width < 0,
        isFlipY: height < 0
      });
    } else if (isLassoActive) {
      const target = e.target as HTMLElement;
      const backdrop = target.closest('.canvas-backdrop') || canvasContainerRef.current?.querySelector('.canvas-backdrop');
      if (!backdrop) return;
      const rect = backdrop.getBoundingClientRect();

      const x = (e.clientX - rect.left) / store.zoom;
      const y = (e.clientY - rect.top) / store.zoom;

      setLassoCurrent({ x, y });

      // Realtime selection intersection checking to make it highly responsive!
      const x1 = Math.min(lassoStart.x, x);
      const y1 = Math.min(lassoStart.y, y);
      const x2 = Math.max(lassoStart.x, x);
      const y2 = Math.max(lassoStart.y, y);

      const width = x2 - x1;
      const height = y2 - y1;

      if (width > 2 && height > 2) {
        const intersectingShapes = (store.currentShapeBlocks || []).filter(shape => {
          const sx1 = shape.x;
          const sy1 = shape.y;
          const sx2 = shape.x + shape.width;
          const sy2 = shape.y + shape.height;
          return (sx1 < x2 && sx2 > x1 && sy1 < y2 && sy2 > y1);
        });

        const newSelectedIds = intersectingShapes.map(s => s.id);
        const unionSet = new Set([...lassoInitialSelectedIdsRef.current, ...newSelectedIds]);
        const unionList = Array.from(unionSet);

        setSelectedShapeIds(unionList);
        setSelectedShapeId(unionList.length === 1 ? unionList[0] : null);
      }
    }
  };

  const handleShapePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawingShape && tempShape) {
      setIsDrawingShape(false);

      if (tempShape.width > 5 || tempShape.height > 5 || tempShape.type === 'line' || tempShape.type === 'arrow') {
        const finalShape: ShapeBlock = {
          ...tempShape,
          id: `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        };
        store.addShapeBlock(finalShape);
        toast.success('Shape drawn!');
      }

      setTempShape(null);
    } else if (isLassoActive) {
      setIsLassoActive(false);

      const count = selectedShapeIds.length;
      if (count > 0) {
        toast.success(`Selected ${count} shape${count > 1 ? 's' : ''}!`);
      }
    }
  };

  // Shape select & dragging pointer starting step
  const handleShapeDragStart = (shape: ShapeBlock, e: React.PointerEvent) => {
    if (store.activeTool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    setMovingShapeId(shape.id);

    // Coordinate state update based on selection array
    let nextIds = [...selectedShapeIds];
    if (!selectedShapeIds.includes(shape.id)) {
      if (e.shiftKey || e.metaKey) {
        nextIds = [...selectedShapeIds, shape.id];
      } else {
        nextIds = [shape.id];
      }
      setSelectedShapeIds(nextIds);
      setSelectedShapeId(nextIds.length === 1 ? nextIds[0] : null);
    }

    const targetElement = e.target as HTMLElement;
    const backdrop = targetElement.closest('.canvas-backdrop') || canvasContainerRef.current?.querySelector('.canvas-backdrop');
    if (backdrop) {
      const rect = backdrop.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / store.zoom;
      const clickY = (e.clientY - rect.top) / store.zoom;
      setShapeDragOffset({ x: clickX, y: clickY });
    }
  };

  // 1. High-precision dragging and resizing at the window scope to avoid cursor-loss errors
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      // Delta-based dragging for robust multi-element translation
      if (movingShapeId && shapeDragOffset) {
        const backdrop = canvasContainerRef.current?.querySelector('.canvas-backdrop');
        if (!backdrop) return;
        const rect = backdrop.getBoundingClientRect();

        const currentX = (e.clientX - rect.left) / store.zoom;
        const currentY = (e.clientY - rect.top) / store.zoom;

        const deltaX = currentX - shapeDragOffset.x;
        const deltaY = currentY - shapeDragOffset.y;

        if (deltaX !== 0 || deltaY !== 0) {
          selectedShapeIds.forEach(id => {
            const sh = store.currentShapeBlocks.find(s => s.id === id);
            if (sh) {
              store.updateShapeBlock(id, {
                x: Math.max(0, sh.x + deltaX),
                y: Math.max(0, sh.y + deltaY)
              });
            }
          });
          setShapeDragOffset({ x: currentX, y: currentY });
        }
      }

      // Delta-based resizing for selected shape block
      if (resizingShapeId && shapeResizeStart) {
        const deltaX = (e.clientX - shapeResizeStart.x) / store.zoom;
        const deltaY = (e.clientY - shapeResizeStart.y) / store.zoom;

        store.updateShapeBlock(resizingShapeId, {
          width: Math.max(10, shapeResizeStart.width + deltaX),
          height: Math.max(10, shapeResizeStart.height + deltaY)
        });
      }
    };

    const handleUp = () => {
      setMovingShapeId(null);
      setResizingShapeId(null);
    };

    if (movingShapeId || resizingShapeId) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [movingShapeId, resizingShapeId, shapeDragOffset, shapeResizeStart, selectedShapeIds, store.zoom, store.currentShapeBlocks]);

  // Collective bounding box of all selected shapes for layout operations
  const groupBoundingBox = useMemo(() => {
    if (selectedShapeIds.length <= 1) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    let found = false;
    selectedShapeIds.forEach(id => {
      const shape = store.currentShapeBlocks?.find(s => s.id === id);
      if (shape) {
        found = true;
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + shape.width);
        maxY = Math.max(maxY, shape.y + shape.height);
      }
    });
    
    if (!found) return null;
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }, [selectedShapeIds, store.currentShapeBlocks]);

  // Align selected shapes relative to the group bounds
  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!groupBoundingBox || selectedShapeIds.length <= 1) return;
    
    store.pushHistory();
    selectedShapeIds.forEach(id => {
      const shape = store.currentShapeBlocks.find(s => s.id === id);
      if (!shape) return;
      
      let newX = shape.x;
      let newY = shape.y;
      
      if (alignment === 'left') {
        newX = groupBoundingBox.x;
      } else if (alignment === 'center') {
        newX = groupBoundingBox.x + (groupBoundingBox.width - shape.width) / 2;
      } else if (alignment === 'right') {
        newX = groupBoundingBox.x + groupBoundingBox.width - shape.width;
      } else if (alignment === 'top') {
        newY = groupBoundingBox.y;
      } else if (alignment === 'middle') {
        newY = groupBoundingBox.y + (groupBoundingBox.height - shape.height) / 2;
      } else if (alignment === 'bottom') {
        newY = groupBoundingBox.y + groupBoundingBox.height - shape.height;
      }
      
      store.updateShapeBlock(id, { x: newX, y: newY });
    });
    
    toast.success(`Aligned shapes: ${alignment}`);
  };

  // Evenly distribute spacing between 3 or more selected shapes
  const handleDistribute = (direction: 'horizontal' | 'vertical') => {
    if (!groupBoundingBox || selectedShapeIds.length <= 2) {
      toast.error('Select 3 or more shapes to distribute spacing');
      return;
    }
    
    store.pushHistory();
    
    const sortedShapes = selectedShapeIds
      .map(id => store.currentShapeBlocks.find(s => s.id === id))
      .filter((s): s is ShapeBlock => !!s);
      
    if (direction === 'horizontal') {
      sortedShapes.sort((a, b) => a.x - b.x);
      
      const count = sortedShapes.length;
      const firstShape = sortedShapes[0];
      const lastShape = sortedShapes[count - 1];
      
      const startX = firstShape.x;
      const endX = lastShape.x + lastShape.width;
      
      const totalSpan = endX - startX;
      const shapesWidthSum = sortedShapes.reduce((sum, s) => sum + s.width, 0);
      
      if (count > 2) {
        const equalGap = (totalSpan - shapesWidthSum) / (count - 1);
        let currentX = startX;
        for (let i = 0; i < count; i++) {
          const s = sortedShapes[i];
          if (i > 0 && i < count - 1) {
            store.updateShapeBlock(s.id, { x: currentX });
          }
          currentX += s.width + equalGap;
        }
      }
    } else {
      sortedShapes.sort((a, b) => a.y - b.y);
      
      const count = sortedShapes.length;
      const firstShape = sortedShapes[0];
      const lastShape = sortedShapes[count - 1];
      
      const startY = firstShape.y;
      const endY = lastShape.y + lastShape.height;
      
      const totalSpan = endY - startY;
      const shapesHeightSum = sortedShapes.reduce((sum, s) => sum + s.height, 0);
      
      if (count > 2) {
        const equalGap = (totalSpan - shapesHeightSum) / (count - 1);
        let currentY = startY;
        for (let i = 0; i < count; i++) {
          const s = sortedShapes[i];
          if (i > 0 && i < count - 1) {
            store.updateShapeBlock(s.id, { y: currentY });
          }
          currentY += s.height + equalGap;
        }
      }
    }
    
    toast.success(`Distributed shapes ${direction === 'horizontal' ? 'horizontally' : 'vertically'}`);
  };

  // 2. High-precision keyboard delete listeners for streamlined shape manipulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.hasAttribute('contenteditable');
      if (isInputFocused) return;

      if (e.key === 'Escape' && selectedShapeIds.length > 0) {
        e.preventDefault();
        setSelectedShapeIds([]);
        setSelectedShapeId(null);
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && store.activeTool === 'select' && selectedShapeIds.length > 0) {
        e.preventDefault();
        const count = selectedShapeIds.length;
        selectedShapeIds.forEach(id => store.deleteShapeBlock(id));
        setSelectedShapeIds([]);
        setSelectedShapeId(null);
        toast.success(`Deleted ${count} shape${count > 1 ? 's' : ''}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShapeIds, store.activeTool]);

  // Canvas pan features
  const handlePanDown = (e: React.MouseEvent) => {
    if (store.activeTool !== 'pan') return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      x: canvasContainerRef.current?.scrollLeft || 0,
      y: canvasContainerRef.current?.scrollTop || 0
    });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    if (canvasContainerRef.current) {
      canvasContainerRef.current.scrollLeft = scrollStart.x - dx;
      canvasContainerRef.current.scrollTop = scrollStart.y - dy;
    }
  };

  const handlePanUp = () => {
    setIsPanning(false);
  };

  // Background CSS selector matcher
  const getBackgroundClass = () => {
    const bg = store.activePage?.background;
    if (bg === 'ruled') return 'bg-ruled-pattern';
    if (bg === 'grid') return 'bg-grid-pattern';
    if (bg === 'dotted') return 'bg-dotted-pattern';
    return 'bg-white';
  };

  // Calculate continuous pages count
  const PAGE_HEIGHT = 1130;
  let maxY = 0;

  store.currentStrokes?.forEach(s => {
    s.points.forEach(p => maxY = Math.max(maxY, p.y));
  });
  store.currentTextBlocks?.forEach(t => maxY = Math.max(maxY, t.y + 100)); // rough height estimate
  store.currentImageBlocks?.forEach(i => maxY = Math.max(maxY, i.y + i.height));
  store.currentShapeBlocks?.forEach(s => maxY = Math.max(maxY, s.y + s.height));

  if (tempShape) {
    maxY = Math.max(maxY, tempShape.y + tempShape.height);
  }

  // Always keep at least 1 page. Expand dynamically as user goes near the bottom (400px buffer).
  const pagesCount = Math.max(1, Math.ceil((maxY + 400) / PAGE_HEIGHT));

  const isSelectActive = store.activeTool === 'select';

  // Load all pages for the active notebook to render them continuously
  const [notebookPages, setNotebookPages] = useState<Page[]>([]);

  useEffect(() => {
    let active = true;
    if (store.activeNotebookId) {
      listPages(store.activeNotebookId).then((pgs) => {
        if (active) {
          const sorted = [...pgs].sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
          setNotebookPages(sorted);
        }
      });
    } else {
      setNotebookPages([]);
    }
    return () => { active = false; };
  }, [store.activeNotebookId, store.activePageId]);

  const pdfSource = store.activeNotebook?.pdfSource || store.activePage?.pdfSource || null;
  const isPdfFile = pdfSource ? pdfSource.startsWith('data:application/pdf') : false;

  const [sharedPdfBlobUrl, setSharedPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfSource || !isPdfFile) {
      setSharedPdfBlobUrl(null);
      return;
    }

    try {
      const base64Data = pdfSource.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSharedPdfBlobUrl(url);

      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to create parent PDF blob:', e);
      setSharedPdfBlobUrl(pdfSource); // Fallback
    }
  }, [pdfSource, isPdfFile]);

  if (isPdfFile && !sharedPdfBlobUrl) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-bg-tertiary dark:bg-[#12131A]" id="main-fy-notebook-stage">
        <div className="p-8 text-center bg-white dark:bg-[#1A1C24] rounded-lg shadow-md border border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-text-primary dark:text-gray-300">Preparing notebook files...</p>
        </div>
      </div>
    );
  }

  const renderPages = () => (
    <div className="flex flex-col items-center space-y-12 py-4">
      {notebookPages.map((page) => {
        const isActive = store.activePageId === page.id;

        if (isActive) {
          return (
            <div
              key={page.id}
              onClick={handleCanvasClick}
              className="canvas-backdrop relative shrink-0 shadow-lg border-2 border-brand-primary dark:border-[#38bdf8] rounded bg-white"
              style={{
                width: `${800 * store.zoom}px`,
                height: `${(pagesCount * PAGE_HEIGHT) * store.zoom}px`,
              }}
            >
              {/* Sheet Backgrounds */}
              {Array.from({ length: pagesCount }).map((_, i) => (
                <div
                  key={`page-bg-${i}`}
                  className={`absolute left-0 w-full shadow-sm border border-gray-200 dark:border-[#2E303B] rounded-sm pointer-events-none ${getBackgroundClass()}`}
                  style={{
                    top: i * PAGE_HEIGHT * store.zoom,
                    height: (PAGE_HEIGHT - 20) * store.zoom, // 20px gap between papers
                    backgroundColor: store.darkMode ? '#1A1C24' : 'var(--color-bg-primary)',
                    zIndex: 0
                  }}
                >
                  {/* Page Number Indicator */}
                  <div 
                    className="absolute bottom-4 left-0 w-full text-center text-gray-400/80 dark:text-gray-600 font-sans text-xs font-semibold tracking-widest leading-none select-none"
                  >
                    - Page {page.pageNumber || 1} ({i + 1}/{pagesCount}) -
                  </div>
                </div>
              ))}

              {/* Draw PDF page beneath ink ink layer if templated */}
              {store.activePage?.background === 'pdf' && (
                <PDFBackground pdfSource={store.activeNotebook?.pdfSource || store.activePage?.pdfSource || null} zoom={store.zoom} pdfPage={store.activePage.pdfPage} />
              )}

              {/* Lasso selection visual overlay */}
              {isLassoActive && (
                <div
                  className="absolute border border-dashed border-violet-500 bg-violet-500/10 pointer-events-none z-30 rounded-xs"
                  style={{
                    left: Math.min(lassoStart.x, lassoCurrent.x) * store.zoom,
                    top: Math.min(lassoStart.y, lassoCurrent.y) * store.zoom,
                    width: Math.abs(lassoCurrent.x - lassoStart.x) * store.zoom,
                    height: Math.abs(lassoCurrent.y - lassoStart.y) * store.zoom,
                  }}
                />
              )}

              {/* Group selection bounding box container with premium layout controls */}
              {groupBoundingBox && (
                <div
                  className="absolute border border-dashed border-violet-600 bg-violet-600/[0.03] pointer-events-none z-20 rounded-sm"
                  style={{
                    left: groupBoundingBox.x * store.zoom,
                    top: groupBoundingBox.y * store.zoom,
                    width: groupBoundingBox.width * store.zoom,
                    height: groupBoundingBox.height * store.zoom,
                  }}
                >
                  {/* Floating Action Menu above the group selection */}
                  <div
                    className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#1E2028] shadow-xl border border-gray-200 dark:border-gray-800 rounded-xl pointer-events-auto z-40 transition-all duration-150 select-none scale-90 sm:scale-100 whitespace-nowrap"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 px-1 border-r border-gray-100 dark:border-gray-800">
                      Layout
                    </div>
                    
                    <button
                      onClick={() => handleAlign('left')}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold pointer-events-auto"
                      title="Align Lefts"
                    >
                      Align ⇤
                    </button>
                    
                    <button
                      onClick={() => handleAlign('center')}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold pointer-events-auto"
                      title="Align Horizontally"
                    >
                      Center ⬌
                    </button>
                    
                    <button
                      onClick={() => handleAlign('right')}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold pointer-events-auto"
                      title="Align Rights"
                    >
                      Align ⇥
                    </button>
                    
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-0.5" />
                    
                    <button
                      onClick={() => handleAlign('top')}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold pointer-events-auto"
                      title="Align Tops"
                    >
                      Top ↥
                    </button>
                    
                    <button
                      onClick={() => handleAlign('bottom')}
                      className="p-1 px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold pointer-events-auto"
                      title="Align Bottoms"
                    >
                      Bot ↧
                    </button>
                    
                    {selectedShapeIds.length >= 3 && (
                      <>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-0.5" />
                        <button
                          onClick={() => handleDistribute('horizontal')}
                          className="p-1 px-2 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-violet-600 dark:text-violet-400 rounded text-xs font-semibold pointer-events-auto"
                          title="Distribute Spacing"
                        >
                          ↔ Distribute
                        </button>
                      </>
                    )}
                    
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-0.5" />
                    
                    <button
                      onClick={() => {
                        const count = selectedShapeIds.length;
                        selectedShapeIds.forEach(id => store.deleteShapeBlock(id));
                        setSelectedShapeIds([]);
                        setSelectedShapeId(null);
                        toast.success(`Deleted ${count} shapes`);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors pointer-events-auto"
                      title="Delete Selected Group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Draggable user-drawn vector shapes element deck */}
              {store.currentShapeBlocks?.map((shape) => {
                const rectWidth = shape.width * store.zoom;
                const rectHeight = shape.height * store.zoom;
                const isMoving = movingShapeId === shape.id;
                const isSelected = selectedShapeIds.includes(shape.id);

                return (
                  <div
                    key={shape.id}
                    onPointerDown={(e) => handleShapeDragStart(shape, e)}
                    className={`shape-block-item absolute rounded group border transition-shadow duration-150 ${
                      isSelected 
                        ? 'border-brand-primary border-dashed bg-brand-light/10 z-30 ring-1 ring-brand-primary/30' 
                        : 'border-transparent'
                    } ${
                      isSelectActive ? 'hover:border-dashed hover:border-brand-primary cursor-move' : ''
                    }`}
                    style={{
                      left: shape.x * store.zoom,
                      top: shape.y * store.zoom,
                      width: rectWidth,
                      height: rectHeight,
                      zIndex: (isMoving || isSelected) ? 26 : 10
                    }}
                  >
                    {/* Floating shape context controls */}
                    {(isSelectActive && isSelected) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedShapeIds.length > 1) {
                            const count = selectedShapeIds.length;
                            selectedShapeIds.forEach(id => store.deleteShapeBlock(id));
                            setSelectedShapeIds([]);
                            setSelectedShapeId(null);
                            toast.success(`Deleted ${count} shapes`);
                          } else {
                            store.deleteShapeBlock(shape.id);
                            setSelectedShapeIds(prev => prev.filter(id => id !== shape.id));
                            setSelectedShapeId(null);
                          }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute -top-3 -right-3 p-1.5 bg-white text-text-muted hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-full shadow-sm transition-all duration-150 z-30 opacity-100"
                        title="Delete Shape"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {/* Corner resize handle for selected shape */}
                    {isSelectActive && isSelected && selectedShapeIds.length === 1 && (
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizingShapeId(shape.id);
                          setShapeResizeStart({
                            width: shape.width,
                            height: shape.height,
                            x: e.clientX,
                            y: e.clientY
                          });
                        }}
                        className="resize-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-brand-primary shadow-sm rounded-full flex items-center justify-center cursor-se-resize hover:scale-110 transition-all duration-110 z-30"
                        title="Resize Shape"
                      >
                        <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
                      </div>
                    )}

                    {/* SVG Canvas drawing representation */}
                    <svg className="w-full h-full pointer-events-none select-none overflow-visible">
                      {shape.type === 'rectangle' && (
                        <rect
                          x={0}
                          y={0}
                          width="100%"
                          height="100%"
                          fill={shape.fillColor || 'transparent'}
                          stroke={shape.borderColor}
                          strokeWidth={shape.borderWidth * store.zoom}
                        />
                      )}
                      {shape.type === 'circle' && (
                        <ellipse
                          cx="50%"
                          cy="50%"
                          rx="45%"
                          ry="45%"
                          fill={shape.fillColor || 'transparent'}
                          stroke={shape.borderColor}
                          strokeWidth={shape.borderWidth * store.zoom}
                        />
                      )}
                      {shape.type === 'triangle' && (
                        <polygon
                          points={`${rectWidth / 2},0 ${rectWidth},${rectHeight} 0,${rectHeight}`}
                          fill={shape.fillColor || 'transparent'}
                          stroke={shape.borderColor}
                          strokeWidth={shape.borderWidth * store.zoom}
                        />
                      )}
                      {shape.type === 'line' && (
                        <line
                          x1={shape.isFlipX ? "100%" : "0"}
                          y1={shape.isFlipY ? "100%" : "0"}
                          x2={shape.isFlipX ? "0" : "100%"}
                          y2={shape.isFlipY ? "0" : "100%"}
                          stroke={shape.borderColor}
                          strokeWidth={shape.borderWidth * store.zoom}
                        />
                      )}
                      {shape.type === 'arrow' && (
                        <>
                          <defs>
                            <marker
                              id={`arrow-active-${shape.id}`}
                              markerWidth="10"
                              markerHeight="7"
                              refX="9"
                              refY="3.5"
                              orient="auto"
                              markerUnits="strokeWidth"
                            >
                              <polygon points="0 0, 10 3.5, 0 7" fill={shape.borderColor} />
                            </marker>
                          </defs>
                          <line
                            x1={shape.isFlipX ? "100%" : "0"}
                            y1={shape.isFlipY ? "100%" : "0"}
                            x2={shape.isFlipX ? "0" : "100%"}
                            y2={shape.isFlipY ? "0" : "100%"}
                            stroke={shape.borderColor}
                            strokeWidth={shape.borderWidth * store.zoom}
                            markerEnd={`url(#arrow-active-${shape.id})`}
                          />
                        </>
                      )}
                    </svg>
                  </div>
                );
              })}

              {/* Drawing preview layout outline for shapes */}
              {isDrawingShape && tempShape && (
                <div
                  className="absolute border border-dashed pointer-events-none z-30"
                  style={{
                    left: tempShape.x * store.zoom,
                    top: tempShape.y * store.zoom,
                    width: `${Math.max(tempShape.width, 1) * store.zoom}px`,
                    height: `${Math.max(tempShape.height, 1) * store.zoom}px`,
                    borderColor: tempShape.borderColor,
                    borderWidth: '1px',
                    backgroundColor: 'rgba(232, 93, 0, 0.05)'
                  }}
                >
                  <svg className="w-full h-full pointer-events-none select-none opacity-70 overflow-visible">
                    {tempShape.type === 'rectangle' && (
                      <rect
                        x={0}
                        y={0}
                        width="100%"
                        height="100%"
                        fill={tempShape.fillColor || 'transparent'}
                        stroke={tempShape.borderColor}
                        strokeWidth={tempShape.borderWidth * store.zoom}
                      />
                    )}
                    {tempShape.type === 'circle' && (
                      <ellipse
                        cx="50%"
                        cy="50%"
                        rx="45%"
                        ry="45%"
                        fill={tempShape.fillColor || 'transparent'}
                        stroke={tempShape.borderColor}
                        strokeWidth={tempShape.borderWidth * store.zoom}
                      />
                    )}
                    {tempShape.type === 'triangle' && (() => {
                      const tW = Math.max(tempShape.width, 1) * store.zoom;
                      const tH = Math.max(tempShape.height, 1) * store.zoom;
                      return (
                        <polygon
                          points={`${tW / 2},0 ${tW},${tH} 0,${tH}`}
                          fill={tempShape.fillColor || 'transparent'}
                          stroke={tempShape.borderColor}
                          strokeWidth={tempShape.borderWidth * store.zoom}
                        />
                      );
                    })()}
                    {tempShape.type === 'line' && (
                      <line
                        x1={tempShape.isFlipX ? "100%" : "0"}
                        y1={tempShape.isFlipY ? "100%" : "0"}
                        x2={tempShape.isFlipX ? "0" : "100%"}
                        y2={tempShape.isFlipY ? "0" : "100%"}
                        stroke={tempShape.borderColor}
                        strokeWidth={tempShape.borderWidth * store.zoom}
                      />
                    )}
                    {tempShape.type === 'arrow' && (
                      <>
                        <defs>
                          <marker
                            id="arrow-preview-marker"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <polygon points="0 0, 10 3.5, 0 7" fill={tempShape.borderColor} />
                          </marker>
                        </defs>
                        <line
                          x1={tempShape.isFlipX ? "100%" : "0"}
                          y1={tempShape.isFlipY ? "100%" : "0"}
                          x2={tempShape.isFlipX ? "0" : "100%"}
                          y2={tempShape.isFlipY ? "0" : "100%"}
                          stroke={tempShape.borderColor}
                          strokeWidth={tempShape.borderWidth * store.zoom}
                          markerEnd="url(#arrow-preview-marker)"
                        />
                      </>
                    )}
                  </svg>
                </div>
              )}

              {/* Handwriting, Highlighter ink lines and Point-rubber actions */}
              <HandwritingLayer
                strokes={store.currentStrokes}
                activeTool={store.activeTool}
                penColor={store.penColor}
                penWidth={store.penWidth}
                brushType={store.brushType}
                highlightColor={store.highlightColor}
                highlightWidth={store.highlightWidth}
                eraserWidth={store.eraserWidth}
                eraserMode={store.eraserMode}
                zoom={store.zoom}
                darkMode={store.darkMode}
                pagesCount={pagesCount}
                onStrokeEnd={handleStrokeEnd}
                onStrokesChange={handleStrokesChange}
              />

              {/* Absolute rich-text block layers */}
              {store.currentTextBlocks?.map((block) => (
                <TextBlock
                  key={block.id}
                  block={block}
                  zoom={store.zoom}
                  onUpdate={(id, up) => store.updateTextBlock(id, up)}
                  onDelete={(id) => store.deleteTextBlock(id)}
                  isSelectToolActive={isSelectActive}
                />
              ))}

              {/* Absolute inserted images layers */}
              {store.currentImageBlocks?.map((img) => (
                <ImageBlock
                  key={img.id}
                  block={img}
                  zoom={store.zoom}
                  onUpdate={(id, up) => store.updateImageBlock(id, up)}
                  onDelete={(id) => store.deleteImageBlock(id)}
                  isSelectToolActive={isSelectActive}
                />
              ))}
            </div>
          );
        } else {
          return (
            <StaticPageSheet
              key={page.id}
              page={page}
              pdfSource={store.activeNotebook?.pdfSource || null}
              zoom={store.zoom}
              darkMode={store.darkMode}
              onActivate={handlePageActivate}
            />
          );
        }
      })}
    </div>
  );

  return (
    <div 
      className="flex-1 h-full overflow-hidden flex flex-col items-center relative animate-fade-in bg-bg-tertiary dark:bg-[#12131A]"
      id="main-fy-notebook-stage"
    >
      {/* Scrollable canvas workspace paper wrapping bounds */}
      <div
        ref={canvasContainerRef}
        onMouseDown={handlePanDown}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanUp}
        onMouseLeave={handlePanUp}
        onPointerDown={handleShapePointerDown}
        onPointerMove={handleShapePointerMove}
        onPointerUp={handleShapePointerUp}
        className={`w-full h-full p-2 sm:p-8 flex justify-start sm:justify-center items-start overflow-auto ${
          store.activeTool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        style={{
          touchAction: (store.activeTool === 'pen' || store.activeTool === 'highlighter' || store.activeTool === 'eraser') ? 'none' : 'auto'
        }}
      >
        {notebookPages.length > 0 ? (
          isPdfFile ? (
            <Document
              file={sharedPdfBlobUrl}
              loading={<div className="p-8 text-gray-400 dark:text-gray-500 text-sm font-semibold">Loading rendering context...</div>}
              error={<div className="p-8 text-red-500 text-sm font-semibold">Error rendering document context.</div>}
            >
              {renderPages()}
            </Document>
          ) : (
            renderPages()
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full max-w-sm text-center py-20 animate-fade-in self-center m-auto">
            <div className="bg-brand-light dark:bg-brand-primary/10 text-brand-primary p-4 rounded-full animate-bounce">
              <Sparkles size={36} />
            </div>
            <h3 className="text-sm font-bold text-text-primary dark:text-gray-100 mt-4 select-none">No active notebook page opened</h3>
            <p className="text-xs text-text-muted dark:text-gray-400 mt-1.5 leading-relaxed">
              Choose a notebook from the sidebar index to read, write and study. Free, local-first and unlimited.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
