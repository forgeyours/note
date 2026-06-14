/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page as PageType, Notebook as NotebookType } from '../../types';
import { FileText, Plus, Trash2, Edit3, Settings, MoreVertical, Layers, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface NotebookItemProps {
  notebook: NotebookType;
  pages: PageType[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: (notebookId: string) => void;
  onRenamePage: (pageId: string, newTitle: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenameNotebook: (notebookId: string, name: string, coverStyle: string) => void;
  onDeleteNotebook: (notebookId: string) => void;
}

export default function NotebookItem({
  notebook,
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onRenameNotebook,
  onDeleteNotebook,
}: NotebookItemProps) {
  const [isEditingNotebook, setIsEditingNotebook] = useState(false);
  const [editNbName, setEditNbName] = useState(notebook.name);
  const [editCoverStyle, setEditCoverStyle] = useState(notebook.coverStyle || 'plain');

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageTitle, setEditPageTitle] = useState('');
  const [showDeleteConfirmNb, setShowDeleteConfirmNb] = useState(false);

  const handleSaveNotebook = () => {
    if (editNbName.trim()) {
      onRenameNotebook(notebook.id, editNbName, editCoverStyle);
      setIsEditingNotebook(false);
    }
  };

  const handleStartEditingPage = (page: PageType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditPageTitle(page.title);
  };

  const handleSavePageTitle = (pageId: string) => {
    if (editPageTitle.trim()) {
      onRenamePage(pageId, editPageTitle);
      setEditingPageId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E2028] rounded-xl shadow-xs border border-gray-100 dark:border-[#2E303B]/60 p-3 flex flex-col space-y-3" id={`nb-editor-${notebook.id}`}>
      {/* Notebook details bar */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {isEditingNotebook ? (
            <div className="flex flex-col space-y-2 p-2 bg-bg-secondary dark:bg-[#12131A] rounded border border-gray-200 dark:border-[#2E303B]">
              <input
                type="text"
                className="w-full px-2 py-1 text-xs font-semibold border border-gray-300 dark:border-[#2E303B] bg-white dark:bg-[#1E2028] text-text-primary dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-brand-primary"
                value={editNbName}
                onChange={(e) => setEditNbName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNotebook();
                  if (e.key === 'Escape') setIsEditingNotebook(false);
                }}
                autoFocus
              />
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-text-muted dark:text-gray-400 font-bold tracking-wide uppercase">Cover Pattern</label>
                <div className="flex flex-wrap items-center gap-1">
                  {(['plain', 'ruled', 'grid', 'dotted'] as const).map((pattern) => (
                    <button
                      key={pattern}
                      type="button"
                      className={`px-1.5 py-0.5 text-[9px] uppercase rounded border transition-all duration-105 shrink-0 ${
                        editCoverStyle === pattern 
                          ? 'border-brand-primary bg-brand-light dark:bg-brand-primary/10 text-brand-primary font-bold' 
                          : 'border-gray-200 dark:border-[#2E303B] bg-white dark:bg-[#1E2028] text-text-secondary dark:text-gray-300 hover:bg-bg-secondary dark:hover:bg-[#252834]'
                      }`}
                      onClick={() => setEditCoverStyle(pattern)}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1.5 border-t border-gray-100 dark:border-[#2E303B]">
                <button 
                  className="p-1 text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:hover:bg-green-905/30 hover:bg-green-100 rounded focus:outline-none"
                  onClick={handleSaveNotebook}
                >
                  <Check size={14} />
                </button>
                <button 
                  className="p-1 text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-905/30 hover:bg-red-100 rounded focus:outline-none"
                  onClick={() => setIsEditingNotebook(false)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col pointer-events-none">
              <span className="text-xs font-bold text-text-primary dark:text-white group flex items-center space-x-1 pointer-events-none">
                <span 
                  className="truncate pointer-events-none"
                  style={{
                    fontSize: '6px',
                    lineHeight: '30px',
                    height: '24px',
                    marginLeft: '-2px',
                    marginRight: '12px',
                    marginTop: '-1px',
                    marginBottom: '0px',
                    paddingLeft: '4px',
                    paddingRight: '12px'
                  }}
                >
                  {notebook.name}
                </span>
              </span>
              <span 
                className="text-[10px] text-text-muted dark:text-gray-400 mt-0.5 pointer-events-none"
                style={{
                  marginRight: '-32px',
                  marginLeft: '0px',
                  paddingLeft: '9px'
                }}
              >
                {pages.length} Pages • Storage: Local
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {!isEditingNotebook && (
          <div className="flex items-center space-x-1 shrink-0 z-10 relative">
            <button
              onClick={() => setIsEditingNotebook(true)}
              title="Notebook Settings"
              className="hover:bg-bg-secondary dark:hover:bg-[#252834] text-text-secondary dark:text-gray-300 hover:text-brand-primary rounded z-10 relative"
              style={{
                paddingLeft: '4px',
                paddingTop: '4px',
                paddingRight: '4px',
                marginRight: '-5px'
              }}
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => {
                if (!showDeleteConfirmNb) {
                  setShowDeleteConfirmNb(true);
                  toast.error(`Click the Trash button again to confirm deleting the notebook "${notebook.name}".`);
                  setTimeout(() => setShowDeleteConfirmNb(false), 3000);
                  return;
                }
                onDeleteNotebook(notebook.id);
                setShowDeleteConfirmNb(false);
              }}
              title={showDeleteConfirmNb ? "Click again to confirm!" : "Delete Notebook"}
              className={`p-1 hover:bg-bg-secondary dark:hover:bg-[#252834] rounded z-10 relative transition-colors ${
                showDeleteConfirmNb ? 'text-red-500 bg-red-50 dark:bg-red-950/20 animate-pulse font-bold' : 'text-text-muted dark:text-gray-400 hover:text-red-600'
              }`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Pages list inside Notebook */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2E303B] pb-1.5 mb-1">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary dark:text-gray-300 font-bold flex items-center space-x-1 pointer-events-none">
            <Layers size={10} />
            <span style={{ fontSize: '9px' }}>Pages Index</span>
          </span>
          <button
            onClick={() => onAddPage(notebook.id)}
            className="flex items-center justify-center space-x-1 px-1 py-0.5 rounded text-[10px] bg-brand-light dark:bg-brand-primary/10 text-brand-primary font-bold hover:bg-brand-primary hover:text-white transition-all duration-150 z-10 relative cursor-pointer"
            style={{ width: '50.28125px', height: '29px' }}
          >
            <Plus size={10} />
            <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: '11.5px' }}>New Page</span>
          </button>
        </div>

        <div className="flex flex-col space-y-1 max-h-[300px] overflow-y-auto pr-1">
          {pages.length === 0 ? (
            <div className="text-[11px] text-text-muted dark:text-gray-400 italic py-3 text-center bg-bg-secondary dark:bg-[#12131A] rounded-lg">
              No pages yet. Create one above!
            </div>
          ) : (
            pages.map((page, idx) => {
              const isPageActive = activePageId === page.id;
              const isPageEditing = editingPageId === page.id;

              return (
                <div
                  key={page.id}
                  id={`page-nav-${page.id}`}
                  className={`flex items-center justify-between rounded-lg p-2 text-xs transition-all duration-150 cursor-pointer ${
                    isPageActive
                      ? 'bg-brand-primary text-white font-medium shadow-sm'
                      : 'text-text-secondary dark:text-gray-300 hover:bg-bg-secondary dark:hover:bg-[#252834] border border-transparent'
                  }`}
                  onClick={() => onSelectPage(page.id)}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <FileText size={13} className={isPageActive ? 'text-white' : 'text-text-secondary dark:text-gray-300'} />
                    {isPageEditing ? (
                      <input
                        type="text"
                        className="flex-1 text-xs text-text-primary dark:text-white bg-white dark:bg-[#1E2028] px-1 py-0.5 rounded border border-gray-300 dark:border-[#2E303B] focus:outline-none"
                        value={editPageTitle}
                        onChange={(e) => setEditPageTitle(e.target.value)}
                        onBlur={() => handleSavePageTitle(page.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePageTitle(page.id);
                          if (e.key === 'Escape') setEditingPageId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span className="truncate pr-1 font-medium">
                        {idx + 1}. {page.title || `Untitled Page`}
                      </span>
                    )}
                  </div>

                  {!isPageEditing && (
                    <div className="flex items-center space-x-1 opacity-85 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        title="Rename"
                        onClick={(e) => handleStartEditingPage(page, e)}
                        className={`p-0.5 rounded ${isPageActive ? 'hover:bg-brand-hover text-white' : 'hover:bg-bg-tertiary dark:hover:bg-[#252834] text-text-muted dark:text-gray-400 hover:text-text-primary'}`}
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        title="Delete Page"
                        onClick={() => {
                          onDeletePage(page.id);
                          toast.success(`Page "${page.title}" deleted successfully.`);
                        }}
                        className={`p-0.5 rounded ${isPageActive ? 'hover:bg-brand-hover text-white' : 'hover:bg-bg-tertiary dark:hover:bg-[#252834] text-text-muted dark:text-gray-400 hover:text-red-500'}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
