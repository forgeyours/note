/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Page, Stroke, TextBlock, ImageBlock, ShapeBlock, Notebook } from '../types';
import { listPages, saveNotebook, savePage, getNotebook } from './db';
import { drawStrokes } from './canvasEngine';

/**
 * Creates a flat composite canvas for a page, including its background, shapes, strokes, and text layers.
 */
export async function createPageCompositeCanvas(
  page: Page,
  strokes: Stroke[],
  options: { darkMode: boolean }
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const PAGE_HEIGHT = 1130;
  let maxY = 0;
  strokes?.forEach(s => s.points.forEach(p => maxY = Math.max(maxY, p.y)));
  (page.textBlocks || []).forEach(t => maxY = Math.max(maxY, t.y + 100)); 
  (page.imageBlocks || []).forEach(i => maxY = Math.max(maxY, i.y + i.height));
  (page.shapeBlocks || []).forEach(s => maxY = Math.max(maxY, s.y + s.height));

  const pagesCount = Math.max(1, Math.ceil((maxY + 400) / PAGE_HEIGHT));

  // High resolution target for exporting (A4 equivalent 800x1130 ratios)
  const width = 800;
  const height = PAGE_HEIGHT * pagesCount;
  canvas.width = width;
  canvas.height = height;

  if (!ctx) return canvas;

  // 1. Draw solid background
  ctx.fillStyle = options.darkMode ? '#1E2028' : '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw dividers and backgrounds per sheet
  for (let i = 0; i < pagesCount; i++) {
    const sheetY = i * PAGE_HEIGHT;
    
    // Draw styled backgrounds (ruled, grid, dotted)
    if (page.background === 'ruled') {
      ctx.strokeStyle = options.darkMode ? '#2E323E' : '#E2E8F0';
      ctx.lineWidth = 1;
      for (let y = sheetY + 50; y < sheetY + PAGE_HEIGHT; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (page.background === 'grid') {
      ctx.strokeStyle = options.darkMode ? '#2E323E' : '#F1F5F9';
      ctx.lineWidth = 1;
      // draw verticals
      for (let x = 0; x < width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, sheetY);
        ctx.lineTo(x, sheetY + PAGE_HEIGHT);
        ctx.stroke();
      }
      // draw horizontals
      for (let y = sheetY; y < sheetY + PAGE_HEIGHT; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (page.background === 'dotted') {
      ctx.fillStyle = options.darkMode ? '#475569' : '#CBD5E1';
      for (let x = 12; x < width; x += 24) {
        for (let y = sheetY + 12; y < sheetY + PAGE_HEIGHT; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (page.background === 'pdf') {
      const parentNotebook = await getNotebook(page.notebookId);
      const compositeSource = page.pdfSource || parentNotebook?.pdfSource;
      if (compositeSource) {
        // If background is a PDF page image, draw it
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = compositeSource;
          await new Promise((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, sheetY, width, PAGE_HEIGHT);
              resolve(true);
            };
            img.onerror = () => resolve(false);
          });
        } catch (e) {
          console.error('Failed to draw PDF reference background during composite', e);
        }
      }
    }

    // Numbering text at bottom of sheet
    ctx.fillStyle = options.darkMode ? '#475569' : '#94A3B8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`- ${i + 1} -`, width / 2, sheetY + PAGE_HEIGHT - 20);
  }

  // 3. Draw Shapes
  const shapes: ShapeBlock[] = page.shapeBlocks || [];
  shapes.forEach((shape) => {
    ctx.save();
    ctx.fillStyle = shape.fillColor || 'transparent';
    ctx.strokeStyle = shape.borderColor || '#E85D00';
    ctx.lineWidth = shape.borderWidth || 2;

    if (shape.type === 'rectangle') {
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      const rx = shape.width / 2;
      const ry = shape.height / 2;
      ctx.ellipse(shape.x + rx, shape.y + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (shape.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(shape.x + shape.width / 2, shape.y);
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
      ctx.lineTo(shape.x, shape.y + shape.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
      ctx.stroke();
    } else if (shape.type === 'arrow') {
      const fromx = shape.x;
      const fromy = shape.y;
      const tox = shape.x + shape.width;
      const toy = shape.y + shape.height;
      
      // draw line
      ctx.beginPath();
      ctx.moveTo(fromx, fromy);
      ctx.lineTo(tox, toy);
      ctx.stroke();

      // draw arrow heads
      const angle = Math.atan2(toy - fromy, tox - fromx);
      const headlen = 10;
      ctx.beginPath();
      ctx.moveTo(tox, toy);
      ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(tox, toy);
      ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
    ctx.restore();
  });

  // 4. Draw Inserted Images
  const images: ImageBlock[] = page.imageBlocks || [];
  for (const imgBlock of images) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgBlock.src;
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, imgBlock.x, imgBlock.y, imgBlock.width, imgBlock.height);
          resolve(true);
        };
        img.onerror = () => resolve(false);
      });
    } catch (e) {
      console.error('Image block render failed', e);
    }
  }

  // 5. Draw Handwriting Ink strokes
  drawStrokes(ctx, strokes, { scale: 1, darkMode: options.darkMode });

  // 6. Draw Text Blocks (Rasterize HTML text content cleanly)
  // To render wealthy rich text elements smoothly on drawing context:
  const textBlocks: TextBlock[] = page.textBlocks || [];
  textBlocks.forEach((tb) => {
    ctx.save();
    ctx.fillStyle = options.darkMode ? '#FFFFFF' : '#1A1D23';
    ctx.font = `${tb.fontSize || 14}px ${tb.fontFamily || 'Inter'}`;
    
    // Quick sanitizing and rendering of multi-line rich text blocks onto 2D canvas
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tb.content;
    const textLines = tempDiv.innerText.split('\n');
    let lineOffset = 0;
    textLines.forEach((line) => {
      ctx.fillText(line, tb.x, tb.y + 15 + lineOffset);
      lineOffset += (tb.fontSize || 14) * 1.35;
    });
    ctx.restore();
  });

  return canvas;
}

/**
 * Triggers a file download on client-side
 */
export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a single page as a PNG image file
 */
export async function exportPageAsPNG(page: Page, strokes: Stroke[], options: { darkMode: boolean }) {
  const composite = await createPageCompositeCanvas(page, strokes, options);
  const dataUrl = composite.toDataURL('image/png');
  const filename = `${page.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'page'}.png`;
  triggerDownload(dataUrl, filename);
}

/**
 * Exports a single page as a PDF file
 */
export async function exportPageAsPDF(page: Page, strokes: Stroke[], options: { darkMode: boolean }) {
  const composite = await createPageCompositeCanvas(page, strokes, options);
  const PAGE_HEIGHT = 1130;
  const pagesCount = Math.max(1, Math.ceil(composite.height / PAGE_HEIGHT));

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [800, 1130]
  });

  for (let i = 0; i < pagesCount; i++) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = 800;
    pageCanvas.height = PAGE_HEIGHT;
    const pageCtx = pageCanvas.getContext('2d');
    
    if (pageCtx) {
      pageCtx.drawImage(composite, 0, i * PAGE_HEIGHT, 800, PAGE_HEIGHT, 0, 0, 800, PAGE_HEIGHT);
      const dataUrl = pageCanvas.toDataURL('image/png', 1.0);
      
      if (i > 0) {
        pdf.addPage([800, 1130], 'portrait');
      }
      pdf.addImage(dataUrl, 'PNG', 0, 0, 800, PAGE_HEIGHT);
    }
  }

  const filename = `${page.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'page'}.pdf`;
  pdf.save(filename);
}

/**
 * Exports a full notebook as a ZIP folder packed with clean PNG pages
 */
export async function exportNotebookAsZIP(notebookName: string, notebookId: string, options: { darkMode: boolean }) {
  const pages = await listPages(notebookId);
  if (pages.length === 0) {
    throw new Error('This notebook contains no pages to export.');
  }

  const zip = new JSZip();

  // Export raw JSON metadata for future deep importing
  const notebookMetadata = {
    version: 1,
    name: notebookName,
    pages: pages
  };
  zip.file('notebook-data.json', JSON.stringify(notebookMetadata, null, 2));

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    let pageStrokes: Stroke[] = [];
    try {
      pageStrokes = page.canvasData ? JSON.parse(page.canvasData) : [];
    } catch (e) {}

    const composite = await createPageCompositeCanvas(page, pageStrokes, options);
    
    // Get binary blob for the canvas page
    const blob = await new Promise<Blob | null>((resolve) => {
      composite.toBlob((b) => resolve(b), 'image/png');
    });

    if (blob) {
      const sanitizedTitle = page.title.replace(/[^a-z0-9]/gi, '_') || `page_${i + 1}`;
      const filename = `${i + 1}_${sanitizedTitle}.png`;
      zip.file(filename, blob);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(zipBlob);
  const zipFilename = `${notebookName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'notebook'}.zip`;
  
  triggerDownload(downloadUrl, zipFilename);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Imports a notebook from a previously exported ZIP file
 */
export async function importNotebookFromZIP(file: File, targetFolderId: string): Promise<string> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const metadataFile = loadedZip.file('notebook-data.json');
  if (!metadataFile) {
    throw new Error('Invalid notebook archive. Missing notebook-data.json metadata.');
  }

  const metadataText = await metadataFile.async('string');
  const metadata = JSON.parse(metadataText);

  if (!metadata.pages || !Array.isArray(metadata.pages)) {
    throw new Error('Invalid or empty notebook backup.');
  }

  const newNotebookId = `notebook-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const newNotebook: Notebook = {
    id: newNotebookId,
    folderId: targetFolderId,
    name: `${metadata.name} (Imported)`,
    color: '#E85D00',
    coverStyle: 'plain',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: Date.now(),
    pageCount: metadata.pages.length
  };

  await saveNotebook(newNotebook);

  for (let i = 0; i < metadata.pages.length; i++) {
    const p = metadata.pages[i];
    const pageObj = p as Page;
    const newPage: Page = {
      ...pageObj,
      id: `page-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
      notebookId: newNotebookId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await savePage(newPage);
  }

  return newNotebookId;
}
