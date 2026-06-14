/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import { 
  PenTool, 
  Highlighter, 
  Eraser, 
  Type, 
  Image as ImageIcon, 
  Square, 
  MousePointer, 
  Hand,
  Activity,
  Download,
  BrainCircuit,
  CloudLightning,
  Undo2,
  Redo2,
  Trash2,
  Grid,
  ZoomIn,
  ZoomOut,
  Sparkles,
  HelpCircle,
  Folder,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Sun,
  Moon,
  Coffee,
  Laptop
} from 'lucide-react';
import PenPicker from './PenPicker';
import EraserPicker from './EraserPicker';
import HighlighterPicker from './HighlighterPicker';
import Sidebar from '../sidebar/Sidebar';

interface PageToolbarProps {
  onAddImage: () => void;
  onOpenFlashcards: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onOpenDrive: () => void;
  onOpenImport: () => void;
  onOpenInstall: () => void;
}

export default function PageToolbar({
  onAddImage,
  onOpenFlashcards,
  onOpenExport,
  onOpenSettings,
  onOpenDrive,
  onOpenImport,
  onOpenInstall
}: PageToolbarProps) {
  const store = useAppStore();

  const [showPenPopup, setShowPenPopup] = useState(false);
  const [showEraserPopup, setShowEraserPopup] = useState(false);
  const [showHighlightPopup, setShowHighlightPopup] = useState(false);
  const [showBackgroundSelect, setShowBackgroundSelect] = useState(false);

  // Breadcrumbs
  const hasPage = store.activePageId !== null;

  return (
    <div 
      className="relative flex flex-col bg-white dark:bg-[#1A1D23] select-none shrink-0 z-50 border-b border-gray-200 dark:border-[#2E303B]" 
      id="main-fy-toolbar"
    >
      {/* Top row: File details & Global operations */}
      <div 
        className="flex items-center justify-between px-4 py-2 flex-wrap gap-2"
        style={{ minHeight: '52px' }}
      >
        {/* Left side: Breadcrumb path details or native Expand button */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 min-w-0 relative">
          <button
            onClick={store.toggleSidebar}
            title="Folders Menu"
            className={`p-1.5 mr-3 rounded-md transition-colors ${
              store.sidebarOpen 
                ? 'bg-gray-200 dark:bg-[#2A2D35] text-gray-900 dark:text-gray-100' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2A2D35]'
            }`}
          >
            <Folder size={16} />
          </button>
          
          {store.sidebarOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 cursor-auto"
                onPointerDown={(e) => store.toggleSidebar()}
              />
              <Sidebar onOpenSettings={onOpenSettings} onOpenImport={onOpenImport} />
            </>
          )}

          <div className="flex items-center space-x-2 animate-fade-in">
            <a 
              href="https://forgeyours.space"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-150 cursor-pointer"
              title="Visit ForgeYours"
              id="brand-logo-link"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-500 text-white shadow-sm">
                <PenTool size={13} strokeWidth={3} />
              </div>
              <span className="font-bold text-gray-800 dark:text-gray-100 hidden sm:inline-block mr-2 tracking-tight">ForgeYours Notes</span>
            </a>
            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block mx-1"></div>
            
            <div className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 dark:bg-[#252834] dark:hover:bg-[#2A2D35] px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 transition-colors ml-1">
              <FileText size={14} className="text-gray-500" />
              <span className="font-medium text-xs text-gray-700 dark:text-gray-200 truncate max-w-[90px] xs:max-w-[150px] sm:max-w-[200px]">
                {store.activePage ? store.activePage.title : 'Untitled Page'}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Operations panel */}
        <div 
          className="flex items-center space-x-2 flex-wrap"
        >
          {/* Support */}
          <button
            title="Support"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            <span className="text-orange-500">♥</span>
            <span className="hidden md:inline">Support</span>
          </button>

          {/* Local Only text */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400">
            <CloudLightning size={14} strokeWidth={2.5} />
            <span className="hidden md:inline">Local Only</span>
          </div>

          <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block mx-1"></div>

          {/* Theme Cycler */}
          <button
            onClick={() => {
              const themes: ('light' | 'dark' | 'ivory')[] = ['light', 'dark', 'ivory'];
              const currentIndex = themes.indexOf(store.appTheme);
              store.setAppTheme(themes[(currentIndex + 1) % themes.length]);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2D35] transition-colors"
            title="Toggle Theme"
          >
            {store.appTheme === 'dark' ? (
              <Moon size={14} className="text-blue-400" />
            ) : store.appTheme === 'ivory' ? (
              <Coffee size={14} className="text-amber-700" />
            ) : (
              <Sun size={14} className="text-amber-500" />
            )}
            <span className="hidden md:inline capitalize">{store.appTheme}</span>
          </button>

          {/* Export utility */}
          <button
            onClick={onOpenExport}
            disabled={!hasPage}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-40 transition-colors"
            title="Download options"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Download & Install Standalone App option */}
          <button
            onClick={onOpenInstall}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-extrabold text-white bg-[#E85D00] hover:bg-orange-600 dark:bg-[#E85D00] dark:hover:bg-orange-600 shadow-md transition-all transform active:scale-95 duration-100 cursor-pointer ml-1 animate-pulse hover:animate-none"
            title="Install Native App"
            id="pwa-download-navbar-btn"
          >
            <Laptop size={13} strokeWidth={2.5} />
            <span>Download App</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Tool controllers */}
      <div 
        className="flex items-center justify-between px-4 py-1.5 flex-wrap gap-4 bg-white dark:bg-[#1A1D23] border-t border-gray-100 dark:border-[#2E303B]"
        style={{ minHeight: '44px' }}
      >
        {/* Draw Tools selector buttons */}
        <div className="flex items-center space-x-1">
          {/* Pen */}
          <button
            onClick={() => { store.setTool('pen'); setShowPenPopup(false); setShowHighlightPopup(false); setShowEraserPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 relative cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'pen' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-gray-900 dark:text-gray-100' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Drawing Pen"
          >
            <PenTool size={16} strokeWidth={store.activeTool === 'pen' ? 2.5 : 2} />
            {store.activeTool === 'pen' && (
              <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-3 h-0.5 rounded-full" style={{ backgroundColor: store.penColor }} />
            )}
          </button>

          {/* Highlighter */}
          <button
            onClick={() => { store.setTool('highlighter'); setShowHighlightPopup(false); setShowPenPopup(false); setShowEraserPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 relative cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'highlighter' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-amber-600 dark:text-amber-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Mark Highlighter"
          >
            <Highlighter size={16} strokeWidth={store.activeTool === 'highlighter' ? 2.5 : 2} />
            {store.activeTool === 'highlighter' && (
              <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded-full opacity-60" style={{ backgroundColor: store.highlightColor }} />
            )}
          </button>

          {/* Eraser */}
          <button
            onClick={() => { store.setTool('eraser'); setShowEraserPopup(false); setShowPenPopup(false); setShowHighlightPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'eraser' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-red-600 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Eraser (Strokes)"
          >
            <Eraser size={16} strokeWidth={store.activeTool === 'eraser' ? 2.5 : 2} />
          </button>

          {/* Shapes engine */}
          <button
            onClick={() => { store.setTool('shape'); setShowPenPopup(false); setShowHighlightPopup(false); setShowEraserPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 relative cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'shape' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-indigo-600 dark:text-indigo-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Insert Vector Shapes"
          >
            <Square size={16} strokeWidth={store.activeTool === 'shape' ? 2.5 : 2} />
            {store.activeTool === 'shape' && (
              <span className="absolute -top-1 -right-1 text-[8px] uppercase tracking-tighter bg-indigo-500 text-white font-extrabold px-1 py-0.5 rounded-sm scale-75 shadow-sm">
                {store.activeShapeType[0]}
              </span>
            )}
          </button>

          {/* Rich Text box tool */}
          <button
            onClick={() => { store.setTool('text'); setShowPenPopup(false); setShowHighlightPopup(false); setShowEraserPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'text' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-teal-600 dark:text-[#2dd4bf]' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Double-tap on Canvas to add typed Rich Text Block"
          >
            <Type size={16} strokeWidth={store.activeTool === 'text' ? 2.5 : 2} />
          </button>

          {/* Interactive Image box */}
          <button
            onClick={() => { store.setTool('image'); onAddImage(); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'image' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-sky-600 dark:text-sky-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Insert Image block"
          >
            <ImageIcon size={16} strokeWidth={store.activeTool === 'image' ? 2.5 : 2} />
          </button>

          {/* Select Element lasso */}
          <button
            onClick={() => { store.setTool('select'); setShowPenPopup(false); setShowHighlightPopup(false); setShowEraserPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'select' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-violet-600 dark:text-violet-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Lasso / Drag to select strokes and click-reposition text blocks"
          >
            <MousePointer size={16} strokeWidth={store.activeTool === 'select' ? 2.5 : 2} />
          </button>

          {/* Hand pan tool */}
          <button
            onClick={() => { store.setTool('pan'); setShowPenPopup(false); setShowHighlightPopup(false); setShowEraserPopup(false); }}
            disabled={!hasPage}
            className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2A2D35] disabled:opacity-30 ${
              store.activeTool === 'pan' 
                ? 'bg-gray-100 dark:bg-[#2A2D35] text-emerald-600 dark:text-emerald-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            title="Drag Canvas Pan"
          >
            <Hand size={16} strokeWidth={store.activeTool === 'pan' ? 2.5 : 2} />
          </button>
        </div>

        {/* Dynamic Tool config options */}
        <div className="flex items-center space-x-1.5 relative flex-wrap text-sm text-gray-700 dark:text-gray-300">
          {/* Floating popup anchor for Pen customizable details */}
          {hasPage && store.activeTool === 'pen' && (
            <div className="relative flex items-center">
              <button
                title="Pen Settings"
                onClick={() => setShowPenPopup(!showPenPopup)}
                className="relative z-30 flex items-center space-x-1.5 px-2 py-1 rounded-md bg-transparent hover:bg-gray-100 dark:hover:bg-[#2A2D35] text-gray-700 dark:text-gray-300 transition-all duration-150 select-none"
              >
                <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: store.penColor }} />
                <span className="capitalize font-medium text-xs">Pen Presets</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showPenPopup ? 'rotate-180' : ''}`} />
              </button>
              {showPenPopup && (
                <>
                  <div 
                    className="fixed inset-0 z-20 cursor-pointer bg-black/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setShowPenPopup(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPenPopup(false);
                    }}
                  />
                  <div 
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 sm:absolute sm:top-full sm:bottom-auto sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-2"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PenPicker
                      color={store.penColor}
                      width={store.penWidth}
                      brushType={store.brushType}
                      onColorChange={(c) => store.setPenColor(c)}
                      onWidthChange={(w) => store.setPenWidth(w)}
                      onBrushTypeChange={(t) => store.setBrushType(t)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Floating popup for Highlighter customizable details */}
          {hasPage && store.activeTool === 'highlighter' && (
            <div className="relative flex items-center">
              <button
                title="Highlighter Settings"
                onClick={() => setShowHighlightPopup(!showHighlightPopup)}
                className="relative z-30 flex items-center space-x-1.5 px-2 py-1 rounded-md bg-transparent hover:bg-gray-100 dark:hover:bg-[#2A2D35] text-gray-700 dark:text-gray-300 transition-all duration-150 select-none"
              >
                <span className="w-3.5 h-2.5 rounded-sm border border-yellow-400/30 opacity-80" style={{ backgroundColor: store.highlightColor }} />
                <span className="font-medium text-xs">Marker Details</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showHighlightPopup ? 'rotate-180' : ''}`} />
              </button>
              {showHighlightPopup && (
                <>
                  <div 
                    className="fixed inset-0 z-20 cursor-pointer bg-black/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setShowHighlightPopup(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHighlightPopup(false);
                    }}
                  />
                  <div 
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 sm:absolute sm:top-full sm:bottom-auto sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-2"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HighlighterPicker
                      color={store.highlightColor}
                      width={store.highlightWidth}
                      onColorChange={(c) => store.setHighlightColor(c)}
                      onWidthChange={(w) => store.setHighlightWidth(w)}
                      darkMode={store.darkMode}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Floating popup for Eraser width */}
          {hasPage && store.activeTool === 'eraser' && (
            <div className="relative flex items-center">
              <button
                title="Eraser Settings"
                onClick={() => setShowEraserPopup(!showEraserPopup)}
                className="relative z-30 flex items-center space-x-1.5 px-2 py-1 rounded-md bg-transparent hover:bg-gray-100 dark:hover:bg-[#2A2D35] text-gray-700 dark:text-gray-300 transition-all duration-150 select-none"
              >
                <span className="font-medium text-xs">
                  {store.eraserWidth}px {store.eraserMode === 'part' ? 'Part' : 'Full'} Eraser
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showEraserPopup ? 'rotate-180' : ''}`} />
              </button>
              {showEraserPopup && (
                <>
                  <div 
                    className="fixed inset-0 z-20 cursor-pointer bg-black/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setShowEraserPopup(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEraserPopup(false);
                    }}
                  />
                  <div 
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 sm:absolute sm:top-full sm:bottom-auto sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-2"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EraserPicker
                      width={store.eraserWidth}
                      onWidthChange={(w) => store.setEraserWidth(w)}
                      mode={store.eraserMode}
                      onModeChange={(m) => store.setEraserMode(m)}
                      darkMode={store.darkMode}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Floating popup for Shapes options */}
          {hasPage && store.activeTool === 'shape' && (
            <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-800 pl-2 ml-1">
              {(['rectangle', 'circle', 'triangle', 'line', 'arrow'] as const).map((type) => (
                <button
                  key={type}
                  title={`Draw ${type}`}
                  onClick={() => store.setShapeType(type)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    store.activeShapeType === type 
                       ? 'bg-gray-100 dark:bg-[#2A2D35] text-indigo-600 dark:text-indigo-400' 
                       : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1E2028]'
                  }`}
                >
                  {type === 'rectangle' && 'Box'}
                  {type === 'circle' && 'Circle'}
                  {type === 'triangle' && 'Tri'}
                  {type === 'line' && 'Line'}
                  {type === 'arrow' && 'Arrow'}
                </button>
              ))}
            </div>
          )}

          {/* Background template selectors */}
          {hasPage && (
            <div className="relative flex items-center border-l border-gray-200 dark:border-gray-800 pl-2 ml-1">
              <button
                onClick={() => { setShowBackgroundSelect(!showBackgroundSelect); setShowPenPopup(false); setShowHighlightPopup(false); setShowEraserPopup(false); }}
                className="relative z-30 flex items-center space-x-1.5 px-2 py-1 rounded-md bg-transparent hover:bg-gray-100 dark:hover:bg-[#2A2D35] text-gray-700 dark:text-gray-300 transition-all duration-150 select-none"
                title="Paper Template Layout"
              >
                <Grid size={14} className="text-gray-500" />
                <span className="capitalize text-xs font-medium">Layout</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showBackgroundSelect ? 'rotate-180' : ''}`} />
              </button>
              {showBackgroundSelect && (
                <>
                  <div 
                    className="fixed inset-0 z-20 cursor-pointer bg-black/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setShowBackgroundSelect(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBackgroundSelect(false);
                    }}
                  />
                  <div 
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 sm:absolute sm:top-full sm:bottom-auto sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-2 bg-white dark:bg-[#1E2028] border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xl p-3 w-[180px] flex flex-col space-y-1.5"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-text-muted dark:text-gray-400 uppercase tracking-wider mb-1 px-1">Templates</div>
                    {(['plain', 'ruled', 'grid', 'dotted'] as const).map((bg) => (
                      <button
                        key={bg}
                        onClick={() => {
                          store.updatePageBackground(bg);
                          setShowBackgroundSelect(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-between hover:bg-bg-secondary dark:hover:bg-[#12131A]/60 ${
                          store.activePage?.background === bg 
                            ? 'text-brand-primary dark:text-[#38bdf8] font-bold bg-brand-light dark:bg-[#38bdf8]/10' 
                            : 'text-text-secondary dark:text-gray-300'
                        }`}
                      >
                        <span>
                          {bg === 'plain' && '⬜ Plain Paper'}
                          {bg === 'ruled' && '📄 Ruled Paper'}
                          {bg === 'grid' && '🗺️ Math Grid'}
                          {bg === 'dotted' && '🎯 Bullet Dotted'}
                        </span>
                        {store.activePage?.background === bg && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:bg-[#38bdf8] animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* New ops */}
          {hasPage && (
            <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-800 pl-2 ml-1">
              <button
                onClick={onOpenFlashcards}
                className="flex items-center space-x-1 px-2 py-1 rounded-md bg-transparent hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-700 dark:text-gray-300 hover:text-amber-600 transition-colors select-none text-xs font-medium"
                title="Study Flashcards"
              >
                <CloudLightning size={14} className="text-amber-500" />
                <span className="md:inline hidden">Cards</span>
              </button>
              <button
                onClick={onOpenDrive}
                className="flex items-center space-x-1 px-2 py-1 rounded-md bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors select-none text-xs font-medium"
                title="Google Drive Sync"
              >
                <BrainCircuit size={14} className="text-blue-500" />
                <span className="md:inline hidden">Drive Sync</span>
              </button>
            </div>
          )}

          {/* Undo, Redo, Clear Page parameters */}
          {hasPage && (
            <div className="flex items-center space-x-0.5 border-l border-gray-200 dark:border-gray-800 pl-2 ml-1">
              <button
                onClick={store.undo}
                disabled={store.undoStack.length === 0}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2A2D35] text-gray-600 dark:text-gray-400 rounded-md disabled:opacity-30 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={15} strokeWidth={2} />
              </button>
              <button
                onClick={store.redo}
                disabled={store.redoStack.length === 0}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2A2D35] text-gray-600 dark:text-gray-400 rounded-md disabled:opacity-30 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={15} strokeWidth={2} />
              </button>
              <button
                onClick={() => {
                  store.clearPage();
                  toast.success('Page canvas reset successfully. Use Undo to restore if needed!');
                }}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                title="Clear current page"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          )}

          {/* Zoom controls */}
          {hasPage && (
            <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-800 pl-2 ml-1">
              <button
                title="Zoom Out"
                onClick={() => store.setZoom(store.zoom - 0.1)}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2A2D35] rounded-md transition-colors"
              >
                <ZoomOut size={15} strokeWidth={2} />
              </button>
              <span className="text-[11px] font-medium select-none w-10 text-center text-gray-600 dark:text-gray-300" title="Current Zoom">
                {Math.round(store.zoom * 100)}%
              </span>
              <button
                title="Zoom In"
                onClick={() => store.setZoom(store.zoom + 0.1)}
                className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2A2D35] rounded-md transition-colors"
              >
                <ZoomIn size={15} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
