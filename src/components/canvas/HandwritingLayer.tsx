/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, memo } from 'react';
import { Stroke, Point } from '../../types';
import { drawSingleStroke, drawStrokes, calculateVelocityPressure } from '../../lib/canvasEngine';
import { globalCanvasState } from '../../store/appStore';

const strokeBoundsCache = new WeakMap<Stroke, { minX: number, maxX: number, minY: number, maxY: number }>();

function getStrokeBounds(stroke: Stroke) {
  let bounds = strokeBoundsCache.get(stroke);
  if (!bounds) {
    if (stroke.points.length === 0) {
      bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    } else {
      let minX = stroke.points[0].x;
      let maxX = minX;
      let minY = stroke.points[0].y;
      let maxY = minY;
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      bounds = { minX, maxX, minY, maxY };
    }
    strokeBoundsCache.set(stroke, bounds);
  }
  return bounds;
}

interface HandwritingLayerProps {
  strokes: Stroke[];
  activeTool: string;
  penColor: string;
  penWidth: number;
  brushType: 'normal' | 'calligraphy' | 'dashed' | 'dotted';
  highlightColor: string;
  highlightWidth: number;
  eraserWidth: number;
  eraserMode?: 'part' | 'full';
  zoom: number;
  darkMode: boolean;
  pagesCount: number;
  onStrokeEnd: (stroke: Stroke) => void;
  onStrokesChange?: (strokes: Stroke[]) => void;
}

const HandwritingLayer = memo(function HandwritingLayer({
  strokes,
  activeTool,
  penColor,
  penWidth,
  brushType,
  highlightColor,
  highlightWidth,
  eraserWidth,
  eraserMode = 'part',
  zoom,
  darkMode,
  pagesCount,
  onStrokeEnd,
  onStrokesChange
}: HandwritingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Foreground (Active) Canvas
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null); // Background (Completed Strokes) Canvas
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track synchronous drawing state to avoid React's asynchronous render delays
  const isDrawingRef = useRef(false);
  // Dynamic visual feedback for eraser without triggering re-renders
  const eraserCursorRef = useRef<HTMLDivElement>(null);
  
  // Track drawing details
  const currentPointsRef = useRef<Point[]>([]);
  const lastPointRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const activeDevicePointerId = useRef<number | null>(null);
  const lastEraserPosRef = useRef<{ x: number; y: number } | null>(null);
  const workingStrokesRef = useRef<Stroke[] | null>(null);

  // Sophisticated palm rejection states
  const lastStylusActiveTimeRef = useRef<number>(0);
  const activePointerTypeRef = useRef<string | null>(null);
  const hasStylusDetectedRef = useRef<boolean>(false);

  const abortActiveStroke = () => {
    isDrawingRef.current = false;
    globalCanvasState.isDrawing = false;
    activeDevicePointerId.current = null;
    activePointerTypeRef.current = null;
    currentPointsRef.current = [];
    lastPointRef.current = null;
    workingStrokesRef.current = null;
    redrawForeground();
  };

  const getDpr = () => window.devicePixelRatio || 1;

  // Redraw Background (completed strokes)
  const redrawBackground = () => {
    const bgCanvas = backgroundCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = getDpr();
    // Reset transform & clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, bgCanvas.width / dpr, bgCanvas.height / dpr);

    // Apply scaling
    ctx.scale(zoom, zoom);

    // Draw completed strokes
    drawStrokes(ctx, workingStrokesRef.current || strokes, { scale: 1, darkMode });
  };

  // Redraw Foreground (currently active stroke)
  const redrawForeground = () => {
    const fgCanvas = canvasRef.current;
    if (!fgCanvas) return;
    const ctx = fgCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = getDpr();
    // Reset transform & clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, fgCanvas.width / dpr, fgCanvas.height / dpr);

    // If active drawing is occurring and not erasing, render only the current stroke being written
    if (activeTool !== 'eraser' && isDrawingRef.current && currentPointsRef.current.length > 0) {
      ctx.save();
      // Apply scaling
      ctx.scale(zoom, zoom);

      const activeToolType = activeTool === 'highlighter' ? 'highlighter' : 'pen';
      const activeColor = activeTool === 'highlighter' ? highlightColor : penColor;
      const activeWidth = activeTool === 'highlighter' ? highlightWidth : penWidth;

      const tempStroke: Stroke = {
        id: 'temp-drawing',
        tool: activeToolType,
        color: activeColor,
        width: activeWidth,
        opacity: activeTool === 'highlighter' ? 0.45 : 1,
        points: currentPointsRef.current,
        brushType: activeTool === 'highlighter' ? undefined : brushType
      };
      
      drawSingleStroke(ctx, tempStroke, 1, darkMode);
      ctx.restore();
    }
  };

  // Adjust canvas bounds on layout/zoom resize
  useEffect(() => {
    const resizeCanvas = () => {
      const bgCanvas = backgroundCanvasRef.current;
      const fgCanvas = canvasRef.current;
      if (!bgCanvas || !fgCanvas) return;

      const visualWidth = 800 * zoom; 
      const visualHeight = (1130 * pagesCount) * zoom;
      const dpr = getDpr();

      // Set high-resolution backing metrics
      bgCanvas.width = visualWidth * dpr;
      bgCanvas.height = visualHeight * dpr;

      fgCanvas.width = visualWidth * dpr;
      fgCanvas.height = visualHeight * dpr;

      redrawBackground();
      redrawForeground();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [zoom, pagesCount]);

  // Tracks exactly which strokes we have already fully rasterized to the background buffer
  const renderedStrokesRef = useRef<Stroke[]>([]);
  const lastRasterizedStrokeIdRef = useRef<string | null>(null);

  // Redraw when strokes change or light/dark mode changes
  useEffect(() => {
    // Disable optimization to ensure all strokes are freshly redrawn correctly
    redrawBackground();
    redrawForeground();
    renderedStrokesRef.current = strokes;
  }, [strokes, darkMode]);

  // Ensure complete native iPad swipe / scroll prevention
  useEffect(() => {
    const canvas = Math.random() > -1 ? canvasRef.current : null; // Safe extraction
    if (!canvas) return;

    const preventNativeTouch = (e: TouchEvent) => {
      // Allow scrolling if the user is using 2 fingers to pan, or if active tool is pan
      if (activeTool === 'pan') return;
      if (e.touches.length > 1) return; // Allow pinch/zoom gesture
      
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventNativeTouch, { passive: false });
    canvas.addEventListener('touchmove', preventNativeTouch, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', preventNativeTouch);
      canvas.removeEventListener('touchmove', preventNativeTouch);
    };
  }, [activeTool]);

  // Pointer drawing handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isDrawTool = activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser';
    if (!isDrawTool) return;

    const palmRejection = localStorage.getItem('palm_rejection_level') || 'smart';

    // 1. Stylus-only enforcement
    if (palmRejection === 'stylus' && e.pointerType === 'touch') {
      e.preventDefault();
      return;
    }

    // 2. Smart Palm Rejection
    if (palmRejection === 'smart' && e.pointerType === 'touch') {
      // Discard multi-touch / non-primary touch events
      if (!e.isPrimary) {
        e.preventDefault();
        return;
      }
      
      const activeTimeSuppress = hasStylusDetectedRef.current ? 8000 : 1500;
      const sizeLimit = hasStylusDetectedRef.current ? 12 : 24;

      // Reject contact patches representing hand/palm rest
      if (e.width > sizeLimit || e.height > sizeLimit) {
        e.preventDefault();
        return;
      }
      // If stylus has been hover-active or touching recently, reject touch drawing completely
      if (Date.now() - lastStylusActiveTimeRef.current < activeTimeSuppress) {
        e.preventDefault();
        return;
      }
    }

    // Track last stylus timestamp
    if (e.pointerType === 'pen') {
      lastStylusActiveTimeRef.current = Date.now();
      hasStylusDetectedRef.current = true;
    }

    if (isDrawingRef.current) {
      if (activeDevicePointerId.current !== null && activeDevicePointerId.current !== e.pointerId) {
        if (e.pointerType === 'pen') {
           // Pen touching down overrides active touch (palm rejection missed initial touch down)
           abortActiveStroke();
        } else {
           // Ignore second touch
           e.preventDefault();
           return;
        }
      } else {
        // Same pointer clicked down while supposedly drawing (missed up event)
        handlePointerUp({ pointerId: e.pointerId, preventDefault: () => {} } as any);
      }
    }

    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Pointer capture failed', err);
    }

    isDrawingRef.current = true;
    globalCanvasState.isDrawing = true;
    activeDevicePointerId.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Map viewport click coordinates with zoom factor scale
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Track initial values
    const pressure = e.pointerType === 'mouse' && e.buttons !== 1 
      ? 0.5 
      : e.pressure !== 0 && e.pressure !== 0.5 
        ? e.pressure 
        : 0.5;

    const initialPoint: Point = {
      x,
      y,
      pressure,
      timestamp: Date.now()
    };

    currentPointsRef.current = [initialPoint];
    lastPointRef.current = { x, y, timestamp: Date.now() };

    // Real-time eraser mode (Local wipes out segments)
    if (activeTool === 'eraser') {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      if (eraserCursorRef.current) {
        eraserCursorRef.current.style.left = `${clientX - (eraserWidth * zoom) / 2}px`;
        eraserCursorRef.current.style.top = `${clientY - (eraserWidth * zoom) / 2}px`;
        eraserCursorRef.current.style.transform = 'scale(1)';
        eraserCursorRef.current.style.opacity = '1';
      }
      lastEraserPosRef.current = { x, y };
      workingStrokesRef.current = [...strokes]; // Start with current strokes
      checkForEraserCollision(x, y);
    } else {
      // Draw initial point responsive dot by doing a foreground redraw
      redrawForeground();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Dynamic stylus-hover detection (Hover-based Touch Suppression)
    if (e.pointerType === 'pen') {
      lastStylusActiveTimeRef.current = Date.now();
      hasStylusDetectedRef.current = true;
    }

    const palmRejection = localStorage.getItem('palm_rejection_level') || 'smart';

    // Track cursor location dynamically for the custom physical eraser visual
    if (activeTool === 'eraser') {
      const canvas = canvasRef.current;
      if (canvas && eraserCursorRef.current) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        eraserCursorRef.current.style.left = `${clientX - (eraserWidth * zoom) / 2}px`;
        eraserCursorRef.current.style.top = `${clientY - (eraserWidth * zoom) / 2}px`;
        eraserCursorRef.current.style.opacity = '1';
      }
    }

    if (!isDrawingRef.current || activeDevicePointerId.current !== e.pointerId) {
      if (isDrawingRef.current) {
        // Essential for palm rejection: prevent ambient touches from triggering browser scrolling
        // which would cause a pointercancel on the active pen stroke.
        try { e.preventDefault(); } catch (err) {}
      }
      return;
    }

    // Smart continuous palm-expansion check
    if (activePointerTypeRef.current === 'touch' && palmRejection === 'smart') {
      const activeTimeSuppress = hasStylusDetectedRef.current ? 8000 : 1500;
      const sizeLimit = hasStylusDetectedRef.current ? 12 : 24;
      if (e.width > sizeLimit || e.height > sizeLimit || Date.now() - lastStylusActiveTimeRef.current < activeTimeSuppress) {
        abortActiveStroke();
        return;
      }
    }

    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    const processEvent = (eventClientX: number, eventClientY: number, eventPressure: number) => {
      const x = (eventClientX - rect.left) / zoom;
      const y = (eventClientY - rect.top) / zoom;

      let pressure = 0.5;
      if (e.pointerType === 'pen' && eventPressure > 0) {
        pressure = eventPressure;
      } else if (lastPointRef.current) {
        pressure = calculateVelocityPressure(lastPointRef.current, { x, y, timestamp: Date.now() });
      }

      const currentPoint: Point = {
        x,
        y,
        pressure,
        timestamp: Date.now()
      };

      const len = currentPointsRef.current.length;
      if (len === 0 || currentPointsRef.current[len - 1].x !== x || currentPointsRef.current[len - 1].y !== y) {
        currentPointsRef.current.push(currentPoint);
        lastPointRef.current = { x, y, timestamp: Date.now() };
      }
      
      if (activeTool === 'eraser') {
        const len = currentPointsRef.current.length;
        if (len > 0) {
          const lastPt = currentPointsRef.current[len - 1];
          checkForEraserCollision(lastPt.x, lastPt.y);
        }
      }
    };

    const nativeEvent = e.nativeEvent as any;
    if (nativeEvent.getCoalescedEvents) {
      const events = nativeEvent.getCoalescedEvents();
      if (events && events.length > 0) {
        for (const ev of events) {
          processEvent(ev.clientX, ev.clientY, ev.pressure);
        }
      } else {
        processEvent(e.clientX, e.clientY, e.pressure);
      }
    } else {
      processEvent(e.clientX, e.clientY, e.pressure);
    }
    
    if (activeTool !== 'eraser') {
      redrawForeground();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    
    // Ignore events that are not from the active pointer
    if (activeDevicePointerId.current !== null && activeDevicePointerId.current !== e.pointerId) return;

    e.preventDefault();
    try {
      if ((e.target as HTMLElement).hasPointerCapture && (e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    const canvas = canvasRef.current;
    if (canvas && activeTool !== 'eraser') {
      if (e.clientX !== undefined && e.clientY !== undefined) {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / zoom;
        const cy = (e.clientY - rect.top) / zoom;
        const len = currentPointsRef.current.length;
        if (len === 0 || currentPointsRef.current[len - 1].x !== cx || currentPointsRef.current[len - 1].y !== cy) {
          const finalPoint = { x: cx, y: cy, pressure: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5, timestamp: Date.now() };
          currentPointsRef.current.push(finalPoint);
        }
      }
    }

    isDrawingRef.current = false;
    globalCanvasState.isDrawing = false;
    activePointerTypeRef.current = null;
    
    // De-register the active pointer id when the stroke is done
    if (activeDevicePointerId.current === e.pointerId) {
      activeDevicePointerId.current = null;
    }
    lastPointRef.current = null;

    if (activeTool === 'eraser') {
      if (eraserCursorRef.current) {
        eraserCursorRef.current.style.transform = 'scale(1)';
      }
      
      // Flush changes on PointerUp
      if (workingStrokesRef.current) {
        if (onStrokesChange) {
          onStrokesChange(workingStrokesRef.current);
        } else {
          // Fallback mutable mutation if no callback provided
          strokes.length = 0;
          strokes.push(...workingStrokesRef.current);
          redrawBackground();
        }
      }
      workingStrokesRef.current = null;
    }

    if (activeTool !== 'eraser' && currentPointsRef.current.length > 0) {
      const activeToolType = activeTool === 'highlighter' ? 'highlighter' : 'pen';
      const activeColor = activeTool === 'highlighter' ? highlightColor : penColor;
      const activeWidth = activeTool === 'highlighter' ? highlightWidth : penWidth;

      const finalizedStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tool: activeToolType,
        color: activeColor,
        width: activeWidth,
        opacity: activeTool === 'highlighter' ? 0.45 : 1,
        points: [...currentPointsRef.current],
        brushType: activeTool === 'highlighter' ? undefined : brushType
      };

      // Instantly pop the completed stroke to the background to avoid any frame flicker
      const bgCanvas = backgroundCanvasRef.current;
      if (bgCanvas) {
        const bgCtx = bgCanvas.getContext('2d');
        if (bgCtx) {
          const dpr = getDpr();
          bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          bgCtx.scale(zoom, zoom);
          drawSingleStroke(bgCtx, finalizedStroke, 1, darkMode);
          lastRasterizedStrokeIdRef.current = finalizedStroke.id;
        }
      }

      onStrokeEnd(finalizedStroke);
      currentPointsRef.current = [];
      redrawForeground();
    } else {
      currentPointsRef.current = [];
      redrawForeground();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Treat cancel as abort to immediately clear and discard any rogue cancelled palm scribbles
    if (activeDevicePointerId.current === e.pointerId) {
      abortActiveStroke();
    }
  };

  // Helper calculation for finding the minimum distance from eraser center to a line segment
  const getDistanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    }

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const cx = ax + t * dx;
    const cy = ay + t * dy;

    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  };

  // Check for eraser collisions
  const checkForEraserCollision = (x: number, y: number) => {
    const lastX = lastEraserPosRef.current ? lastEraserPosRef.current.x : x;
    const lastY = lastEraserPosRef.current ? lastEraserPosRef.current.y : y;
    
    // Update last pos for next call
    lastEraserPosRef.current = { x, y };

    let strokesAltered = false;
    let remainingStrokes: Stroke[] = [];
    const localTargetStrokes = workingStrokesRef.current || strokes;

    // Quick AABB bounds for eraser segment
    const maxR = eraserWidth; // generous bounds
    const eraserMinX = Math.min(x, lastX) - maxR;
    const eraserMaxX = Math.max(x, lastX) + maxR;
    const eraserMinY = Math.min(y, lastY) - maxR;
    const eraserMaxY = Math.max(y, lastY) + maxR;

    const R = eraserWidth / 2;

    if (eraserMode === 'part') {
      localTargetStrokes.forEach((stroke) => {
        // Fast stroke AABB check to skip entirely distant strokes
        const bounds = getStrokeBounds(stroke);
        if (bounds.maxX < eraserMinX || bounds.minX > eraserMaxX || bounds.maxY < eraserMinY || bounds.minY > eraserMaxY) {
          remainingStrokes.push(stroke);
          return;
        }

        const runs: Point[][] = [];
        let currentRun: Point[] = [];

        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          
          // Check distance from stroke point to eraser segment
          const distToPoint = getDistanceToSegment(p.x, p.y, lastX, lastY, x, y);
          const isPointErased = distToPoint <= R;

          if (isPointErased) {
            if (currentRun.length > 0) {
              runs.push(currentRun);
              currentRun = [];
            }
          } else {
            currentRun.push(p);
          }
        }

        if (currentRun.length > 0) {
          runs.push(currentRun);
        }

        if (runs.length === 1 && runs[0].length === stroke.points.length) {
          remainingStrokes.push(stroke);
        } else {
          strokesAltered = true;
          runs.forEach((run, index) => {
            if (run.length > 0) {
              remainingStrokes.push({
                ...stroke,
                id: `${stroke.id}-part-${index}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                points: run
              });
            }
          });
        }
      });
    } else {
      // Full Eraser mode
      remainingStrokes = localTargetStrokes.filter((stroke) => {
        // Fast AABB check
        const bounds = getStrokeBounds(stroke);
        if (bounds.maxX < eraserMinX || bounds.minX > eraserMaxX || bounds.maxY < eraserMinY || bounds.minY > eraserMaxY) {
          return true; // Keep, no collision possible
        }

        let hit = false;
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          // Check distance from stroke point to eraser segment
          const distToPoint = getDistanceToSegment(p.x, p.y, lastX, lastY, x, y);
          if (distToPoint <= R) {
            hit = true;
            break;
          }
        }

        if (hit) {
          strokesAltered = true;
        }
        return !hit;
      });
    }

    if (strokesAltered) {
      workingStrokesRef.current = remainingStrokes;
      redrawBackground();
    }
  };

  const isDrawTool = activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser';

  return (
    <div 
      ref={containerRef} 
      className={`relative select-none ${isDrawTool ? '' : 'pointer-events-none'}`}
      style={{
        width: `${800 * zoom}px`,
        height: `${(1130 * pagesCount) * zoom}px`,
        cursor: activeTool === 'eraser' ? 'none' : 'crosshair'
      }}
    >
      {/* Background layer for fully rendered completed strokes */}
      <canvas
        ref={backgroundCanvasRef}
        className="absolute inset-0 select-none block pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          zIndex: 14,
        }}
      />
      {/* Foreground layer for highly interactive, latency-free drawing/erasing action */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 select-none block touch-none ${isDrawTool ? 'z-40' : 'z-15 pointer-events-none'}`}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          WebkitTouchCallout: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerEnter={(e) => {
          if (activeTool === 'eraser') {
            const rect = e.currentTarget.getBoundingClientRect();
            if (eraserCursorRef.current) {
              const clientX = e.clientX - rect.left;
              const clientY = e.clientY - rect.top;
              eraserCursorRef.current.style.left = `${clientX - (eraserWidth * zoom) / 2}px`;
              eraserCursorRef.current.style.top = `${clientY - (eraserWidth * zoom) / 2}px`;
              eraserCursorRef.current.style.transform = 'scale(1)';
              eraserCursorRef.current.style.opacity = '1';
            }
          }
        }}
        onPointerLeave={() => {
          if (activeTool === 'eraser' && eraserCursorRef.current) {
            eraserCursorRef.current.style.opacity = '0';
          }
        }}
      />

      {/* Sophisticated tactile physical eraser follower visualization */}
      {activeTool === 'eraser' && (
        <div 
          ref={eraserCursorRef}
          className="pointer-events-none absolute z-50 rounded-full border border-rose-400 dark:border-rose-500 bg-rose-200/40 dark:bg-rose-950/35 ring-1 ring-rose-500/10 shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-transform duration-75 ease-out"
          style={{
            width: `${eraserWidth * zoom}px`,
            height: `${eraserWidth * zoom}px`,
            opacity: 0,
            left: 0,
            top: 0,
            transform: 'scale(1)',
          }}
        />
      )}
    </div>
  );
});

export default HandwritingLayer;
