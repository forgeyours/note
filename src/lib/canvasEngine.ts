/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point, Stroke } from '../types';

/**
 * Renders a list of strokes to a canvas context.
 */
export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  options: { scale: number; darkMode: boolean }
) {
  const { scale, darkMode } = options;
  
  // Highlight strokes should always sit under other pens/shapes
  const highlighters = strokes.filter((s) => s.tool === 'highlighter');
  const normalStrokes = strokes.filter((s) => s.tool !== 'highlighter');

  highlighters.forEach((stroke) => {
    drawSingleStroke(ctx, stroke, scale, darkMode);
  });
  
  normalStrokes.forEach((stroke) => {
    drawSingleStroke(ctx, stroke, scale, darkMode);
  });
}

/**
 * Draws a single complex stroke onto a canvas context with high-fidelity smoothing.
 */
export function drawSingleStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number,
  darkMode: boolean
) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const defaultColor = stroke.color;
  // If in dark mode, adjust dark strokes to light strokes so they remain visible
  let strokeColor = defaultColor;
  if (darkMode) {
    if (defaultColor === '#1A1D23' || defaultColor === '#000000') {
      strokeColor = '#FFFFFF';
    } else if (defaultColor === '#FFFFFF') {
      strokeColor = '#1A1D23';
    }
  }

  ctx.strokeStyle = strokeColor;
  
  if (stroke.tool === 'highlighter') {
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = 0.45;
  } else {
    ctx.globalAlpha = stroke.opacity || 1;
  }

  const baseWidth = stroke.width * scale;

  if (stroke.points.length === 1) {
    // Single point (a dot)
    const p = stroke.points[0];
    ctx.beginPath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.arc(p.x * scale, p.y * scale, baseWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Draw continuous smooth spline using midpoint quadratic curves
  ctx.beginPath();
  
  let p1 = stroke.points[0];
  let p2 = stroke.points[1];
  
  ctx.moveTo(p1.x * scale, p1.y * scale);

  // Determine brush type styling based on tool and brush configuration state
  const brush = stroke.tool === 'highlighter' ? 'normal' : (stroke.brushType || 'normal');

  if (brush === 'calligraphy') {
    // Beautiful varying-width calligraphy style drawn as smooth overlapping quadratic segments
    if (stroke.points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
      ctx.lineTo(stroke.points[1].x * scale, stroke.points[1].y * scale);
      const avgPressure = ((stroke.points[0].pressure || 0.5) + (stroke.points[1].pressure || 0.5)) / 2;
      ctx.lineWidth = Math.max(1, baseWidth * (0.35 + avgPressure * 1.3));
      ctx.stroke();
    } else {
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        
        const lastXc = ((p0.x + p1.x) / 2) * scale;
        const lastYc = ((p0.y + p1.y) / 2) * scale;
        const xc = ((p1.x + p2.x) / 2) * scale;
        const yc = ((p1.y + p2.y) / 2) * scale;
        
        ctx.beginPath();
        ctx.moveTo(lastXc, lastYc);
        ctx.quadraticCurveTo(p1.x * scale, p1.y * scale, xc, yc);
        
        // Smooth pressure over the 3-point neighborhood
        const avgPressure = ((p0.pressure || 0.5) + (p1.pressure || 0.5) + (p2.pressure || 0.5)) / 3;
        const segmentWidth = baseWidth * (0.35 + avgPressure * 1.3);
        
        ctx.lineWidth = Math.max(1, segmentWidth);
        ctx.stroke();
      }
      // Finish the last segment
      const last = stroke.points[stroke.points.length - 1];
      const prev = stroke.points[stroke.points.length - 2];
      const pPrev = stroke.points[stroke.points.length - 3] || prev;
      ctx.beginPath();
      const lastXc = ((prev.x + pPrev.x) / 2) * scale;
      const lastYc = ((prev.y + pPrev.y) / 2) * scale;
      ctx.moveTo(lastXc, lastYc);
      ctx.lineTo(last.x * scale, last.y * scale);
      ctx.lineWidth = Math.max(1, baseWidth * (0.35 + (last.pressure || 0.5) * 1.3));
      ctx.stroke();
    }
  } else {
    // Solid, Dashed, or Dotted continuous midpoint Bezier spline rendering
    ctx.lineWidth = baseWidth;

    if (brush === 'dashed') {
      ctx.setLineDash([baseWidth * 3, baseWidth * 2.5]);
    } else if (brush === 'dotted') {
      // With lineCap="round", a dash length of 0.1 renders as perfect circular dots
      ctx.setLineDash([0.1, baseWidth * 2.8]);
    }

    ctx.beginPath();
    ctx.moveTo(p1.x * scale, p1.y * scale);
    
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const xc = ((stroke.points[i].x + stroke.points[i + 1].x) / 2) * scale;
      const yc = ((stroke.points[i].y + stroke.points[i + 1].y) / 2) * scale;
      ctx.quadraticCurveTo(
        stroke.points[i].x * scale,
        stroke.points[i].y * scale,
        xc,
        yc
      );
    }
    
    // curve to the last point
    const lastIdx = stroke.points.length - 1;
    ctx.lineTo(stroke.points[lastIdx].x * scale, stroke.points[lastIdx].y * scale);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Calculate velocity-based pressure fallback when drawing with standard touch/mouse
 */
export function calculateVelocityPressure(
  prevPoint: { x: number; y: number; timestamp: number } | null,
  currentPoint: { x: number; y: number; timestamp: number }
): number {
  if (!prevPoint) return 0.5;
  const dist = Math.sqrt(
    Math.pow(currentPoint.x - prevPoint.x, 2) + Math.pow(currentPoint.y - prevPoint.y, 2)
  );
  const time = currentPoint.timestamp - prevPoint.timestamp;
  if (time <= 0) return 0.5;
  
  const speed = dist / time; // pixels per ms
  // Fast speed = low pressure, Slow speed = high pressure
  // Safe bounds: pressure between 0.2 and 1.0
  const pressure = Math.max(0.15, Math.min(1.2, 1.0 - (speed * 0.25)));
  return pressure;
}
