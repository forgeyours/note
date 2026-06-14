/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder as FolderType, Notebook as NotebookType } from '../../types';
import { ChevronRight, ChevronDown, FolderOpen, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface FolderItemProps {
  key?: any;
  folder: FolderType;
  notebooks: NotebookType[];
  activeNotebookId: string | null;
  onSelectNotebook: (notebookId: string) => void;
  onAddNotebook: (folderId: string) => void | Promise<any>;
  onUpdateFolder: (id: string, name: string, color: string, icon: string) => void | Promise<any>;
  onDeleteFolder: (id: string) => void | Promise<any>;
}

export default function FolderItem({
  folder,
  notebooks,
  activeNotebookId,
  onSelectNotebook,
  onAddNotebook,
  onUpdateFolder,
  onDeleteFolder,
}: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [editColor, setEditColor] = useState(folder.color);
  const [editIcon, setEditIcon] = useState(folder.icon);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const colors = [
    '#C62828', // Red
    '#E85D00', // ForgeYours Orange (Accent)
    '#B45309', // Amber
    '#2E7D32', // Green
    '#0070F3', // Blue
    '#7B1FA2', // Purple
    '#C2185B', // Pink
    '#5B6474', // Slate
  ];

  const emojis = ['📚', '🌱', '🎓', '🔬', '✈️', '💻', '💡', '🎨', '📝', '🎸'];

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateFolder(folder.id, editName, editColor, editIcon);
      setIsEditing(false);
      setShowColorPicker(false);
    }
  };

  const handleCancel = () => {
    setEditName(folder.name);
    setEditColor(folder.color);
    setEditIcon(folder.icon);
    setIsEditing(false);
    setShowColorPicker(false);
  };

  return (
    <div className="mb-2" id={`folder-${folder.id}`}>
      {/* Folder Header */}
      <div 
        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-bg-tertiary group transition-all duration-150 cursor-pointer"
        onClick={() => !isEditing && setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* Collapse toggle arrow */}
          <button 
            title={isOpen ? "Collapse Folder" : "Expand Folder"}
            className="text-text-muted hover:text-text-secondary focus:outline-none z-10 relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {isEditing ? (
            <div className="flex flex-col space-y-2 w-full p-2 bg-bg-secondary rounded border border-gray-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-1">
                {/* Emoji Select button */}
                <select
                  className="p-1 text-sm border border-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                >
                  {emojis.map(em => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
                
                {/* Text name input */}
                <input
                  type="text"
                  className="flex-1 px-2 py-0.5 text-xs font-medium border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  autoFocus
                />
              </div>

              {/* Quick Color Picker */}
              <div className="flex flex-wrap gap-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-4 h-4 rounded-full border border-white focus:outline-none transition-transform duration-100 hover:scale-125 focus:ring-1 focus:ring-offset-1 focus:ring-brand-primary"
                    style={{ backgroundColor: c, boxShadow: editColor === c ? '0 0 0 2px var(--color-brand-primary)' : 'none' }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>

              {/* Action confirmations */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#2E303B]">
                <button 
                  title="Delete Folder"
                  type="button"
                  className="px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded flex items-center space-x-1 focus:outline-none"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete folder "${folder.name}"? This will delete all its notebooks and pages permanently.`)) {
                      onDeleteFolder(folder.id);
                      setIsEditing(false);
                    }
                  }}
                >
                  <Trash2 size={12} />
                  <span>Delete Folder</span>
                </button>
                <div className="flex items-center space-x-1.5">
                  <button 
                    title="Save Changes"
                    className="p-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/20 dark:text-green-400 rounded focus:outline-none"
                    onClick={handleSave}
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    title="Cancel"
                    className="p-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded focus:outline-none"
                    onClick={handleCancel}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 min-w-0 pointer-events-none flex-1">
              <span className="text-base select-none">{folder.icon || '📁'}</span>
              <span 
                className="text-xs font-semibold tracking-wide text-text-primary uppercase truncate pointer-events-none"
                style={{
                  color: folder.color,
                  fontSize: '10px',
                  paddingLeft: '6px',
                  paddingRight: '6px',
                  paddingTop: '4px',
                  paddingBottom: '5px'
                }}
              >
                {folder.name}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons (discoverable default state, full opacity on hover) */}
        {!isEditing && (
          <div className="opacity-40 group-hover:opacity-100 flex items-center space-x-1 mr-1 transition-opacity duration-150 z-10 relative cursor-pointer" onClick={(e) => e.stopPropagation()}>
            {/* Create notebook overlay */}
            <button
              title="Add Notebook"
              onClick={() => onAddNotebook(folder.id)}
              className="p-1 hover:bg-bg-secondary text-text-secondary hover:text-brand-primary dark:hover:text-brand-primary rounded"
            >
              <Plus size={14} />
            </button>
            {/* Edit details */}
            <button
              title="Edit Folder"
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-bg-secondary text-text-secondary hover:text-brand-primary dark:hover:text-brand-primary rounded"
            >
              <Edit2 size={14} />
            </button>
            {/* Hard delete */}
            <button
              title={showDeleteConfirm ? "Click again to confirm!" : "Delete Folder"}
              onClick={() => {
                if (!showDeleteConfirm) {
                  setShowDeleteConfirm(true);
                  toast.error(`Click the Trash icon again to delete folder "${folder.name}" and all books!`);
                  setTimeout(() => setShowDeleteConfirm(false), 3000);
                  return;
                }
                onDeleteFolder(folder.id);
                setShowDeleteConfirm(false);
              }}
              className={`p-1 hover:bg-bg-secondary rounded transition-colors ${
                showDeleteConfirm ? 'text-red-600 bg-red-50 dark:bg-red-950/20 animate-pulse font-bold' : 'text-text-muted hover:text-red-600'
              }`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Notebooks list */}
      <AnimatePresence>
        {isOpen && !isEditing && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-5 overflow-hidden flex flex-col space-y-1 mt-1 border-l-2 border-gray-100 ml-3"
          >
            {notebooks.length === 0 ? (
              <div className="flex flex-col items-start pl-2 py-1">
                <span className="text-[11px] text-text-muted italic mb-1.5">No notebooks yet</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAddNotebook(folder.id); }}
                  className="text-[10px] flex items-center space-x-1 border border-dashed border-gray-300 dark:border-[#2E303B] rounded px-1.5 py-0.5 text-text-muted hover:text-brand-primary hover:border-brand-primary dark:hover:border-brand-primary transition-colors"
                >
                  <Plus size={10} />
                  <span>Add Notebook</span>
                </button>
              </div>
            ) : (
              <>
                {notebooks.map((nb) => {
                  const isActive = activeNotebookId === nb.id;
                  return (
                    <div
                      key={nb.id}
                      className={`flex items-center justify-between py-1 px-2.5 rounded-lg group text-xs cursor-pointer transition-all duration-150 ${
                        isActive 
                          ? 'bg-brand-light text-brand-primary font-medium dark:bg-brand-primary/20 dark:text-brand-light' 
                          : 'text-text-secondary dark:text-gray-300 hover:bg-bg-tertiary dark:hover:bg-[#252834]'
                      }`}
                      onClick={() => onSelectNotebook(nb.id)}
                      id={`notebook-${nb.id}`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <FolderOpen 
                          size={14} 
                          style={{ color: isActive ? 'var(--color-brand-primary)' : nb.color || 'var(--color-text-secondary)' }} 
                        />
                        <span className="truncate">{nb.name}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {/* Cached pages count badge */}
                        <span className="bg-bg-tertiary dark:bg-[#1E2028] group-hover:bg-bg-secondary dark:group-hover:bg-[#2A2D35] text-text-muted dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[10px] scale-90 border border-gray-200 dark:border-[#2E303B]">
                          {nb.pageCount || 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 pb-1 flex pl-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddNotebook(folder.id); }}
                    className="text-[10px] flex items-center space-x-1 border border-dashed border-gray-300 dark:border-[#2E303B] rounded px-1.5 py-0.5 text-text-muted hover:text-brand-primary hover:border-brand-primary dark:hover:border-brand-primary transition-colors"
                  >
                    <Plus size={10} />
                    <span>Add Notebook</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
