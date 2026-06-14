/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Folder {
  id: string;          // 'folder-timestamp-random'
  name: string;
  color: string;       // accent color for visual org
  icon: string;        // emoji or icon name
  createdAt: string;
  updatedAt: string;
  order: number;       // for drag-to-reorder
}

export interface Notebook {
  id: string;
  folderId: string;
  name: string;
  color: string;
  coverStyle: string;  // 'plain' | 'ruled' | 'grid' | 'dotted'
  createdAt: string;
  updatedAt: string;
  order: number;
  pageCount: number;   // cached count
  pdfSource?: string | null; // Base64 or Source for PDF notebooks
}

export interface Page {
  id: string;
  notebookId: string;
  title: string;
  pageNumber: number;
  background: 'plain' | 'ruled' | 'grid' | 'dotted' | 'pdf';
  canvasData: string;  // JSON — strokes array
  textBlocks: TextBlock[];
  imageBlocks: ImageBlock[];
  audioMarkers: AudioMarker[];
  shapeBlocks?: ShapeBlock[];
  pdfSource: string | null;  // base64 or source
  pdfPage: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;    // 0-1
  timestamp: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  brushType?: 'normal' | 'calligraphy' | 'dashed' | 'dotted';
}

export interface TextBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  content: string;     // HTML text or text content
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface ImageBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;         // base64 or URL
  alt: string;
}

export interface AudioMarker {
  id: string;
  x: number;
  y: number;
  audioId: string;     // references audio store
  duration: number;
  createdAt: string;
}

export interface AudioRecording {
  id: string;
  pageId: string;
  blob: Blob;          // raw audio blob
  duration: number;
  mimeType: string;
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  notebookId: string;
  name: string;
  cards: Flashcard[];
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  front: string;       // HTML text
  back: string;        // HTML text
  lastReviewed: string | null;
  confidence: 0 | 1 | 2 | 3;  // 0=new, 1=hard, 2=ok, 3=easy
}

export interface ShapeBlock {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  isFlipX?: boolean;
  isFlipY?: boolean;
}
