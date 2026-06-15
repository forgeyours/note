/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Stroke, TextBlock, ImageBlock, AudioMarker, ShapeBlock, Page, Notebook, FavoriteCombination } from '../types';
import { getPage, savePage, getNotebook } from '../lib/db';

interface HistoryItem {
  strokes: Stroke[];
  textBlocks: TextBlock[];
  imageBlocks: ImageBlock[];
  audioMarkers: AudioMarker[];
  shapeBlocks: ShapeBlock[];
}

interface AppStore {
  // Navigation
  activeFolderId: string | null;
  activeNotebookId: string | null;
  activePageId: string | null;
  
  // Active entity details (to prevent excess DB queries)
  activePage: Page | null;
  activeNotebook: Notebook | null;

  // Canvas tool states
  activeTool: 'pen' | 'highlighter' | 'eraser' | 'text' | 'image' | 'select' | 'pan' | 'shape';
  previousTool: 'pen' | 'highlighter' | 'eraser' | 'text' | 'image' | 'select' | 'pan' | 'shape' | null;
  activeShapeType: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';
  penColor: string;
  penWidth: number;
  brushType: 'normal' | 'calligraphy' | 'dashed' | 'dotted';
  highlightColor: string;
  highlightWidth: number;
  eraserWidth: number;
  eraserMode: 'part' | 'full';
  zoom: number;

  // UI state
  sidebarOpen: boolean;
  appTheme: 'light' | 'dark' | 'ivory';
  darkMode: boolean;

  // Current page content
  currentStrokes: Stroke[];
  currentTextBlocks: TextBlock[];
  currentImageBlocks: ImageBlock[];
  currentAudioMarkers: AudioMarker[];
  currentShapeBlocks: ShapeBlock[];

  // Undo/Redo queues
  undoStack: HistoryItem[];
  redoStack: HistoryItem[];

  // Actions
  setActiveFolderId: (id: string | null) => void;
  setActiveNotebookId: (id: string | null) => Promise<void>;
  setActivePageId: (id: string | null) => Promise<void>;
  
  // Settings & Navigation
  setTool: (tool: 'pen' | 'highlighter' | 'eraser' | 'text' | 'image' | 'select' | 'pan' | 'shape') => void;
  setShapeType: (type: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow') => void;
  setPenColor: (color: string) => void;
  setPenWidth: (width: number) => void;
  setBrushType: (type: 'normal' | 'calligraphy' | 'dashed' | 'dotted') => void;
  setHighlightColor: (color: string) => void;
  setHighlightWidth: (width: number) => void;
  setEraserWidth: (width: number) => void;
  setEraserMode: (mode: 'part' | 'full') => void;
  setZoom: (zoom: number) => void;
  toggleSidebar: () => void;
  setAppTheme: (theme: 'light' | 'dark' | 'ivory') => void;
  toggleDarkMode: () => void;

  // Drawing Actions
  addStroke: (stroke: Stroke) => void;
  setStrokes: (strokes: Stroke[]) => void;
  clearPage: () => void;
  updatePageBackground: (bg: Page['background']) => void;

  // Text block actions
  addTextBlock: (block: TextBlock) => void;
  updateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
  deleteTextBlock: (id: string) => void;

  // Image actions
  addImageBlock: (block: ImageBlock) => void;
  updateImageBlock: (id: string, updates: Partial<ImageBlock>) => void;
  deleteImageBlock: (id: string) => void;

  // Audio actions
  addAudioMarker: (marker: AudioMarker) => void;
  updateAudioMarker: (id: string, updates: Partial<AudioMarker>) => void;
  deleteAudioMarker: (id: string) => void;

  // Shape actions
  addShapeBlock: (shape: ShapeBlock) => void;
  updateShapeBlock: (id: string, updates: Partial<ShapeBlock>) => void;
  deleteShapeBlock: (id: string) => void;

  // History & Undo / Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Favorites
  notebookFavorites: Record<string, FavoriteCombination[]>;
  addFavorite: (notebookId: string, type: 'pen' | 'highlighter', color: string, width: number, brushType?: 'normal' | 'calligraphy' | 'dashed' | 'dotted') => 'success' | 'duplicate' | 'full';
  removeFavorite: (notebookId: string, id: string) => void;
  reorderFavorites: (notebookId: string, startIndex: number, endIndex: number) => void;
}

const initialHistory = {
  strokes: [],
  textBlocks: [],
  imageBlocks: [],
  audioMarkers: [],
  shapeBlocks: []
};

const loadFavorites = (): Record<string, FavoriteCombination[]> => {
  try {
    const data = localStorage.getItem('fy_notebook_favorites');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const globalCanvasState = { isDrawing: false };

let debouncedSaveTimeout: NodeJS.Timeout | null = null;
const performDebouncedSave = (pageId: string, store: AppStore) => {
  if (debouncedSaveTimeout) clearTimeout(debouncedSaveTimeout);
  
  debouncedSaveTimeout = setTimeout(async () => {
    if (globalCanvasState.isDrawing) {
      performDebouncedSave(pageId, store);
      return;
    }

    const page = store.activePage;
    if (!page) return;
    
    const updatedPage: Page = {
      ...page,
      canvasData: JSON.stringify(store.currentStrokes),
      textBlocks: store.currentTextBlocks,
      imageBlocks: store.currentImageBlocks,
      audioMarkers: store.currentAudioMarkers,
      shapeBlocks: store.currentShapeBlocks,
      updatedAt: new Date().toISOString()
    };
    
    await savePage(updatedPage);
    useAppStore.setState({ activePage: updatedPage });
  }, 1500);
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Navigation Defaults
  activeFolderId: null,
  activeNotebookId: null,
  activePageId: null,
  activePage: null,
  activeNotebook: null,

  // App Tools Defaults
  activeTool: 'pen',
  previousTool: null,
  activeShapeType: 'rectangle',
  penColor: '#E85D00', // ForgeYours Orange accent
  penWidth: 3,
  brushType: 'normal',
  highlightColor: '#FFEB3B', // translucent yellow default
  highlightWidth: 15,
  eraserWidth: 20,
  eraserMode: 'part',
  zoom: 1,

  // UI state
  sidebarOpen: false,
  appTheme: 'light',
  darkMode: false,

  // Content Containers
  currentStrokes: [],
  currentTextBlocks: [],
  currentImageBlocks: [],
  currentAudioMarkers: [],
  currentShapeBlocks: [],

  // History Controls
  undoStack: [],
  redoStack: [],

  // SETTERS & TRIVIAL MUTATORS
  setActiveFolderId: (id) => set({ activeFolderId: id }),
  setActiveNotebookId: async (id) => {
    if (!id) {
      set({ activeNotebookId: null, activeNotebook: null });
      return;
    }
    try {
      const notebook = await getNotebook(id);
      set({ activeNotebookId: id, activeNotebook: notebook || null });
    } catch (e) {
      console.error("Failed to fetch notebook", e);
      set({ activeNotebookId: id, activeNotebook: null });
    }
  },
  setActivePageId: async (id) => {
    if (debouncedSaveTimeout) {
      clearTimeout(debouncedSaveTimeout);
      debouncedSaveTimeout = null;
    }
    
    if (!id) {
      set({
        activePageId: null,
        activePage: null,
        currentStrokes: [],
        currentTextBlocks: [],
        currentImageBlocks: [],
        currentAudioMarkers: [],
        currentShapeBlocks: [],
        undoStack: [],
        redoStack: []
      });
      return;
    }

    try {
      const page = await getPage(id);
      if (page) {
        let strokes: Stroke[] = [];
        try {
          strokes = page.canvasData ? JSON.parse(page.canvasData) : [];
        } catch (e) {
          console.error("Failed to parse canvas data", e);
        }

        let notebook = get().activeNotebook;
        if (!notebook || notebook.id !== page.notebookId) {
          notebook = await getNotebook(page.notebookId) || null;
        }

        set({
          activePageId: id,
          activePage: page,
          activeNotebook: notebook,
          currentStrokes: strokes,
          currentTextBlocks: page.textBlocks || [],
          currentImageBlocks: page.imageBlocks || [],
          currentAudioMarkers: page.audioMarkers || [],
          currentShapeBlocks: page.shapeBlocks || [],
          undoStack: [],
          redoStack: []
        });
      }
    } catch (e) {
      console.error("Failed to load page content", e);
    }
  },

  setTool: (tool) => set((state) => {
    if (tool === 'pan' && state.activeTool === 'pan' && state.previousTool) {
      return { activeTool: state.previousTool, previousTool: null };
    }
    if (state.activeTool === tool) return state;
    
    return {
      activeTool: tool,
      previousTool: tool === 'pan' ? state.activeTool : null
    };
  }),
  setShapeType: (type) => set({ activeShapeType: type }),
  setPenColor: (color) => set({ penColor: color }),
  setPenWidth: (width) => set({ penWidth: width }),
  setBrushType: (type) => set({ brushType: type }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  setHighlightWidth: (width) => set({ highlightWidth: width }),
  setEraserWidth: (width) => set({ eraserWidth: width }),
  setEraserMode: (mode) => set({ eraserMode: mode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(zoom, 4)) }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setAppTheme: (theme) => set({ appTheme: theme, darkMode: theme === 'dark' }),
  toggleDarkMode: () => set((state) => {
    const newDark = !state.darkMode;
    return { darkMode: newDark, appTheme: newDark ? 'dark' : 'light' };
  }),

  // HISTORY MANAGER
  pushHistory: () => {
    const state = get();
    const snap: HistoryItem = {
      strokes: [...state.currentStrokes],
      textBlocks: [...state.currentTextBlocks],
      imageBlocks: [...state.currentImageBlocks],
      audioMarkers: [...state.currentAudioMarkers],
      shapeBlocks: [...state.currentShapeBlocks],
    };
    
    // Cap history length to 50
    const newUndo = [...state.undoStack, snap];
    if (newUndo.length > 50) {
      newUndo.shift();
    }

    set({
      undoStack: newUndo,
      redoStack: [] // Clear redo upon new operation
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const previous = state.undoStack[state.undoStack.length - 1];
    const newUndo = state.undoStack.slice(0, state.undoStack.length - 1);
    
    const currentSnap: HistoryItem = {
      strokes: [...state.currentStrokes],
      textBlocks: [...state.currentTextBlocks],
      imageBlocks: [...state.currentImageBlocks],
      audioMarkers: [...state.currentAudioMarkers],
      shapeBlocks: [...state.currentShapeBlocks],
    };

    set({
      currentStrokes: previous.strokes,
      currentTextBlocks: previous.textBlocks,
      currentImageBlocks: previous.imageBlocks,
      currentAudioMarkers: previous.audioMarkers,
      currentShapeBlocks: previous.shapeBlocks,
      undoStack: newUndo,
      redoStack: [...state.redoStack, currentSnap]
    });

    if (state.activePageId) performDebouncedSave(state.activePageId, get());
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const next = state.redoStack[state.redoStack.length - 1];
    const newRedo = state.redoStack.slice(0, state.redoStack.length - 1);

    const currentSnap: HistoryItem = {
      strokes: [...state.currentStrokes],
      textBlocks: [...state.currentTextBlocks],
      imageBlocks: [...state.currentImageBlocks],
      audioMarkers: [...state.currentAudioMarkers],
      shapeBlocks: [...state.currentShapeBlocks],
    };

    set({
      currentStrokes: next.strokes,
      currentTextBlocks: next.textBlocks,
      currentImageBlocks: next.imageBlocks,
      currentAudioMarkers: next.audioMarkers,
      currentShapeBlocks: next.shapeBlocks,
      undoStack: [...state.undoStack, currentSnap],
      redoStack: newRedo
    });

    if (state.activePageId) performDebouncedSave(state.activePageId, get());
  },

  // DATA UPDATING CONTROLLERS
  addStroke: (stroke) => {
    get().pushHistory();
    set((state) => ({
      currentStrokes: [...state.currentStrokes, stroke]
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  setStrokes: (strokes) => {
    get().pushHistory();
    set({ currentStrokes: strokes });
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  clearPage: () => {
    get().pushHistory();
    set({
      currentStrokes: [],
      currentTextBlocks: [],
      currentImageBlocks: [],
      currentShapeBlocks: []
    });
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  updatePageBackground: (bg) => {
    const page = get().activePage;
    if (!page) return;
    const updated = { ...page, background: bg, updatedAt: new Date().toISOString() };
    savePage(updated).then(() => {
      set({ activePage: updated });
    });
  },

  addTextBlock: (block) => {
    get().pushHistory();
    set((state) => ({
      currentTextBlocks: [...state.currentTextBlocks, block]
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  updateTextBlock: (id, updates) => {
    set((state) => ({
      currentTextBlocks: state.currentTextBlocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      )
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  deleteTextBlock: (id) => {
    get().pushHistory();
    set((state) => ({
      currentTextBlocks: state.currentTextBlocks.filter((b) => b.id !== id)
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  addImageBlock: (block) => {
    get().pushHistory();
    set((state) => ({
      currentImageBlocks: [...state.currentImageBlocks, block]
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  updateImageBlock: (id, updates) => {
    set((state) => ({
      currentImageBlocks: state.currentImageBlocks.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      )
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  deleteImageBlock: (id) => {
    get().pushHistory();
    set((state) => ({
      currentImageBlocks: state.currentImageBlocks.filter((img) => img.id !== id)
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  addAudioMarker: (marker) => {
    get().pushHistory();
    set((state) => ({
      currentAudioMarkers: [...state.currentAudioMarkers, marker]
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  updateAudioMarker: (id, updates) => {
    set((state) => ({
      currentAudioMarkers: state.currentAudioMarkers.map((am) =>
        am.id === id ? { ...am, ...updates } : am
      )
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  deleteAudioMarker: (id) => {
    get().pushHistory();
    set((state) => ({
      currentAudioMarkers: state.currentAudioMarkers.filter((am) => am.id !== id)
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  addShapeBlock: (shape) => {
    get().pushHistory();
    set((state) => ({
      currentShapeBlocks: [...state.currentShapeBlocks, shape]
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  updateShapeBlock: (id, updates) => {
    set((state) => ({
      currentShapeBlocks: state.currentShapeBlocks.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      )
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  deleteShapeBlock: (id) => {
    get().pushHistory();
    set((state) => ({
      currentShapeBlocks: state.currentShapeBlocks.filter((s) => s.id !== id)
    }));
    if (get().activePageId) performDebouncedSave(get().activePageId, get());
  },

  notebookFavorites: loadFavorites(),
  addFavorite: (notebookId, type, color, width, brushType) => {
    const current = get().notebookFavorites;
    const existing = current[notebookId] || [];
    
    // Check duplication
    const isDuplicate = existing.some((item) =>
      item.type === type &&
      item.color.toLowerCase() === color.toLowerCase() &&
      item.width === width &&
      (type === 'pen' ? item.brushType === brushType : true)
    );
    
    if (isDuplicate) {
      return 'duplicate';
    }
    
    if (existing.length >= 7) {
      return 'full';
    }
    
    const newFav: FavoriteCombination = {
      id: `${type}-${color.replace('#', '')}-${width}-${brushType || 'normal'}-${Date.now()}`,
      type,
      color,
      width,
      brushType
    };
    
    const updated = {
      ...current,
      [notebookId]: [...existing, newFav]
    };
    
    localStorage.setItem('fy_notebook_favorites', JSON.stringify(updated));
    set({ notebookFavorites: updated });
    return 'success';
  },
  removeFavorite: (notebookId, id) => {
    const current = get().notebookFavorites;
    const existing = current[notebookId] || [];
    const updated = {
      ...current,
      [notebookId]: existing.filter((item) => item.id !== id)
    };
    
    localStorage.setItem('fy_notebook_favorites', JSON.stringify(updated));
    set({ notebookFavorites: updated });
  },
  reorderFavorites: (notebookId, startIndex, endIndex) => {
    const current = get().notebookFavorites;
    const existing = current[notebookId] || [];
    if (startIndex < 0 || startIndex >= existing.length || endIndex < 0 || endIndex >= existing.length) return;
    
    const result = Array.from(existing);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updated = {
      ...current,
      [notebookId]: result
    };
    
    localStorage.setItem('fy_notebook_favorites', JSON.stringify(updated));
    set({ notebookFavorites: updated });
  }
}));
