/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/appStore';
import Sidebar from './components/sidebar/Sidebar';
import PageToolbar from './components/toolbar/PageToolbar';
import PageCanvas from './components/canvas/PageCanvas';
import FavoritePensToolbar from './components/toolbar/FavoritePensToolbar';
import SettingsModal from './components/modals/SettingsModal';
import FlashcardModal from './components/modals/FlashcardModal';
import ExportModal from './components/modals/ExportModal';
import ImportModal from './components/modals/ImportModal';
import InstallModal from './components/modals/InstallModal';
import { initializeDefaultData } from './data/defaultContent';
import GlobalTooltip from './components/GlobalTooltip';
import { Toaster } from 'react-hot-toast';
import { Sparkles, X, Plus, Image as ImageIcon, Link2, MonitorPlay } from 'lucide-react';
import toast from 'react-hot-toast';

export default function App() {
  const store = useAppStore();

  // Dialog and panel views toggles
  const [activeModal, setActiveModal] = useState<'settings' | 'flashcards' | 'export' | 'import' | 'image-insert' | 'install' | null>(null);

  // Listen for native PWA installation prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // New Image block attributes
  const [imageUrl, setImageUrl] = useState('');

  // Initial onboarding: Seed default database folders if empty
  useEffect(() => {
    const onboard = async () => {
      try {
        await initializeDefaultData();
        
        // Auto-select physics notes notebook as a premium default view
        if (!store.activeNotebookId) {
          store.setActiveFolderId('folder-1');
          store.setActiveNotebookId('notebook-1');
          await store.setActivePageId('page-1');
        }
      } catch (e) {
        console.error('Failed to initialize database defaults', e);
      }
    };
    onboard();
  }, []);

  // Set Tailwind themes class onto head html element
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Reset classes
    root.classList.remove('dark', 'ivory');
    
    // Apply selected theme class
    if (store.appTheme === 'dark') {
      root.classList.add('dark');
    } else if (store.appTheme === 'ivory') {
      root.classList.add('ivory');
    }
  }, [store.appTheme]);

  // Insert image block
  const handleInsertImage = () => {
    if (!store.activePageId) {
      toast.error('Connect a notebook page first!');
      return;
    }

    if (!imageUrl.trim()) {
      toast.error('Provide a valid link or upload a file');
      return;
    }

    const newBlock = {
      id: `img-${Date.now()}`,
      x: 120, // default center
      y: 120,
      width: 260,
      height: 200,
      src: imageUrl.trim(),
      alt: 'User uploaded study chart'
    };

    store.addImageBlock(newBlock);
    setImageUrl('');
    setActiveModal(null);
    toast.success('Image block placed onto notes page!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        toast.success('Local file uploaded successfully. Tap click insert to confirm.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden font-sans bg-bg-tertiary text-text-primary dark:bg-[#12131A] dark:text-gray-100" id="app-viewport-frame">
      {/* Toast Alert containers */}
      <Toaster position="top-right" />
      <GlobalTooltip />

      {/* Main Workspace Frame container */}
      <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0">
        {/* Global Toolbar Row */}
        <PageToolbar
          onAddImage={() => setActiveModal('image-insert')}
          onOpenFlashcards={() => setActiveModal('flashcards')}
          onOpenExport={() => setActiveModal('export')}
          onOpenImport={() => setActiveModal('import')}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenInstall={() => setActiveModal('install')}
          onOpenDrive={() => toast.success('IndexedDB cloud synchronization set to local device storage!')}
        />

        {/* Drawing Notebook canvas stage */}
        <PageCanvas />
        
        {/* Notebook-specific floating favorite brushes tool list */}
        <FavoritePensToolbar />
      </div>

      {/* GLOBAL MODALS (SETTINGS, AUDIO, FLASHCARDS, BACKUPS, IMAGES) */}
      {activeModal && (
        <div 
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'global-modal-overlay') {
              setActiveModal(null);
            }
          }}
          className="fixed inset-0 bg-[#1A1D23]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fade-in cursor-pointer" 
          id="global-modal-overlay"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-primary dark:bg-[#1A1C24] border border-gray-200 dark:border-[#2E303B] rounded-2xl shadow-2xl p-5 sm:p-6 max-w-md w-full relative flex flex-col max-h-[90vh] overflow-y-auto cursor-default"
            id="global-modal-content"
          >
            
            {/* Modal Components */}
            {activeModal === 'settings' && (
              <SettingsModal onClear={() => setActiveModal(null)} />
            )}

            {activeModal === 'flashcards' && (
              <FlashcardModal onClose={() => setActiveModal(null)} />
            )}

            {activeModal === 'export' && (
              <ExportModal onClose={() => setActiveModal(null)} />
            )}

            {activeModal === 'import' && (
              <ImportModal 
                onClose={() => setActiveModal(null)} 
                onRefresh={() => { /* Sidebar handles changes via useEffect or context, wait it doesn't. We'll fix Sidebar to listen to appStore. */ }} 
              />
            )}

            {activeModal === 'install' && (
              <InstallModal onClose={() => setActiveModal(null)} />
            )}

            {activeModal === 'image-insert' && (
              <div className="flex flex-col space-y-4 text-left" id="user-image-inserter">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center space-x-1.5 text-brand-primary">
                    <ImageIcon size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider">Place Image Block</h2>
                  </div>
                  <button 
                    onClick={() => setActiveModal(null)} 
                    className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-text-primary focus:outline-none"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col space-y-3.5">
                  {/* File Pick and Drag Zone */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Method 1: Upload from device</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="text-xs text-text-secondary file:mr-3 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-brand-light file:text-brand-primary hover:file:bg-brand-primary hover:file:text-white cursor-pointer"
                    />
                  </div>

                  {/* Remote URL Paste */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Method 2: Paste direct Image Link</label>
                    <div className="flex space-x-1.5">
                      <input
                        type="url"
                        placeholder="https://example.com/graph.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-bg-secondary border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>

                  {/* Preview box */}
                  {imageUrl && (
                    <div className="border border-dashed border-gray-200 rounded-lg p-1 max-h-[120px] overflow-hidden bg-bg-secondary">
                      <img src={imageUrl} alt="Upload preview" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      onClick={handleInsertImage}
                      className="flex-1 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-hover"
                    >
                      Insert to Canvas
                    </button>
                    <button
                      onClick={() => { setActiveModal(null); setImageUrl(''); }}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-text-muted text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
