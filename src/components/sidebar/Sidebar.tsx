/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { importNotebookFromZIP } from '../../lib/exportEngine';
import { 
  listFolders, 
  saveFolder, 
  deleteFolder, 
  listNotebooks, 
  saveNotebook, 
  deleteNotebook,
  listPages,
  savePage,
  deletePage
} from '../../lib/db';
import { Folder, Notebook, Page } from '../../types';
import FolderItem from './FolderItem';
import NotebookItem from './NotebookItem';
import SidebarSearch from './SidebarSearch';
import { 
  FolderPlus, 
  Plus, 
  Settings, 
  HardDrive, 
  GraduationCap, 
  Menu,
  ChevronLeft,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenImport: () => void;
}

export default function Sidebar({ onOpenSettings, onOpenImport }: SidebarProps) {
  const store = useAppStore();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  // Refresh lists
  const refreshStorageLists = async () => {
    try {
      const allFolders = await listFolders();
      setFolders(allFolders);

      const allNotebooks = await listNotebooks();
      setNotebooks(allNotebooks);

      if (store.activeNotebookId) {
        const matchingPages = await listPages(store.activeNotebookId);
        setPages(matchingPages);
      } else {
        setPages([]);
      }
    } catch (e) {
      console.error('Failed to load notebook data from IndexedDB', e);
    }
  };

  useEffect(() => {
    refreshStorageLists();
  }, [store.activeNotebookId, store.activePageId]);

  // FOLDERS Actions
  const handleCreateFolder = async () => {
    const foldersCount = folders.length;
    const name = `Subject Folder ${foldersCount + 1}`;

    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name,
      color: '#E85D00',
      icon: '📚',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: folders.length
    };

    await saveFolder(newFolder);
    toast.success(`Folder "${newFolder.name}" created! Rename using editing tools.`);
    refreshStorageLists();
  };

  const handleUpdateFolder = async (id: string, name: string, color: string, icon: string) => {
    const original = folders.find(f => f.id === id);
    if (!original) return;

    const updated: Folder = {
      ...original,
      name,
      color,
      icon,
      updatedAt: new Date().toISOString()
    };

    await saveFolder(updated);
    refreshStorageLists();
  };

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id);
    if (store.activeFolderId === id) store.setActiveFolderId(null);
    toast.error('Folder deleted');
    refreshStorageLists();
  };

  // NOTEBOOKS Actions
  const handleCreateNotebook = async (folderId: string) => {
    const nbsCount = notebooks.filter(n => n.folderId === folderId).length;
    const name = `Notebook ${nbsCount + 1}`;

    const newNotebook: Notebook = {
      id: `notebook-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      folderId,
      name: name,
      color: '#E85D00',
      coverStyle: 'plain',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: nbsCount,
      pageCount: 0
    };

    await saveNotebook(newNotebook);
    toast.success(`Notebook "${newNotebook.name}" created! Click the settings gears to customize.`);
    refreshStorageLists();
    store.setActiveNotebookId(newNotebook.id);
  };

  const handleRenameNotebook = async (id: string, name: string, coverStyle: string) => {
    const nb = notebooks.find(n => n.id === id);
    if (!nb) return;

    const updated: Notebook = {
      ...nb,
      name,
      coverStyle,
      updatedAt: new Date().toISOString()
    };

    await saveNotebook(updated);
    refreshStorageLists();
    toast.success('Notebook updated');
  };

  const handleDeleteNotebook = async (id: string) => {
    await deleteNotebook(id);
    if (store.activeNotebookId === id) {
      store.setActiveNotebookId(null);
      store.setActivePageId(null);
    }
    toast.error('Notebook deleted');
    refreshStorageLists();
  };

  // PAGES Actions
  const handleCreatePage = async (notebookId: string) => {
    const title = `Page ${pages.length + 1}`;

    const newPage: Page = {
      id: `page-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      notebookId,
      title: title,
      pageNumber: pages.length + 1,
      background: 'plain',
      canvasData: '[]',
      textBlocks: [],
      imageBlocks: [],
      audioMarkers: [],
      shapeBlocks: [],
      pdfSource: null,
      pdfPage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await savePage(newPage);
    toast.success(`New page added as "${title}"! Use inline rename to style.`);
    await refreshStorageLists();
    store.setActivePageId(newPage.id);
  };

  const handleRenamePage = async (id: string, newTitle: string) => {
    const original = pages.find(p => p.id === id);
    if (!original) return;

    const updated: Page = {
      ...original,
      title: newTitle.trim(),
      updatedAt: new Date().toISOString()
    };

    await savePage(updated);
    refreshStorageLists();
  };

  const handleDeletePage = async (id: string) => {
    await deletePage(id);
    if (store.activePageId === id) {
      store.setActivePageId(null);
    }
    toast.error('Page deleted');
    refreshStorageLists();
  };

  const handleSelectNotebook = (notebookId: string) => {
    const nb = notebooks.find(n => n.id === notebookId);
    if (nb) {
      store.setActiveFolderId(nb.folderId);
      store.setActiveNotebookId(nb.id);
      
      // Auto-load first page inside if available
      listPages(notebookId).then((pgs) => {
        if (pgs.length > 0) {
          store.setActivePageId(pgs[0].id);
        } else {
          store.setActivePageId(null);
        }
      });
    }
  };

  const handleSelectPageFromSearch = (pageId: string, notebookId: string) => {
    const nb = notebooks.find(n => n.id === notebookId);
    if (nb) {
      store.setActiveFolderId(nb.folderId);
      store.setActiveNotebookId(nb.id);
      store.setActivePageId(pageId);
    }
  };

  // Currently focused active notebook details
  const activeNb = notebooks.find((n) => n.id === store.activeNotebookId);

  return (
    <div 
      className="absolute top-[100%] mt-2 left-0 w-[280px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-100px)] z-[100] bg-white dark:bg-[#1A1D23] border border-gray-200 dark:border-[#2E303B] rounded-xl shadow-2xl flex flex-col shrink-0 select-none overflow-hidden" 
    >
      {/* Internal Full-text Search interface */}
      <div className="p-3 border-b border-gray-100 dark:border-[#2E303B] bg-gray-50 dark:bg-[#1E2028]">
        <SidebarSearch onSelectPage={handleSelectPageFromSearch} />
      </div>

      {/* Folders & Notebooks navigation index */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-4">
        
        {/* Active Notebook detailed editor card */}
        {activeNb && (
          <NotebookItem
            notebook={activeNb}
            pages={pages}
            activePageId={store.activePageId}
            onSelectPage={(id) => store.setActivePageId(id)}
            onAddPage={handleCreatePage}
            onRenamePage={handleRenamePage}
            onDeletePage={handleDeletePage}
            onRenameNotebook={handleRenameNotebook}
            onDeleteNotebook={handleDeleteNotebook}
          />
        )}

        {/* Directory Navigator catalog */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-text-muted dark:text-gray-400 px-1">
            <span>Folders Catalog</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onOpenImport}
                className="p-1 text-text-muted hover:text-brand-primary dark:hover:text-brand-primary rounded"
                title="Open / Import Files"
              >
                <Upload size={13} />
              </button>
              <button
                onClick={handleCreateFolder}
                className="p-1 text-text-muted hover:text-brand-primary dark:hover:text-brand-primary rounded"
                title="Create Folder"
              >
                <FolderPlus size={13} />
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            {folders.length === 0 ? (
              <div className="text-center py-6 bg-white dark:bg-[#1E2028] border border-dashed border-gray-200 dark:border-[#2E303B] rounded-xl">
                <p className="text-[11px] text-text-muted dark:text-gray-400">No folders cataloged.</p>
                <button
                  onClick={handleCreateFolder}
                  className="mt-1 text-[11px] text-brand-primary font-bold hover:underline"
                >
                  Create Folder
                </button>
              </div>
            ) : (
              folders.map((folder) => {
                const folderNotebooks = notebooks.filter(n => n.folderId === folder.id);
                return (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    notebooks={folderNotebooks}
                    activeNotebookId={store.activeNotebookId}
                    onSelectNotebook={handleSelectNotebook}
                    onAddNotebook={handleCreateNotebook}
                    onUpdateFolder={handleUpdateFolder}
                    onDeleteFolder={handleDeleteFolder}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Workspace Footing Actions */}
      <div className="p-3 border-t border-gray-200 dark:border-[#2E303B] bg-white dark:bg-[#1E2028] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-text-secondary dark:text-gray-300 text-[10px]">
          <HardDrive size={12} className="text-text-muted dark:text-gray-400" />
          <span>Local Device Storage</span>
        </div>

        <button
          onClick={onOpenSettings}
          title="App Settings"
          className="p-1.5 hover:bg-bg-secondary dark:hover:bg-[#252834] text-text-secondary dark:text-gray-300 hover:text-brand-primary rounded"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
