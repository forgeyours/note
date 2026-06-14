/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { exportPageAsPNG, exportNotebookAsZIP, exportPageAsPDF } from '../../lib/exportEngine';
import { listNotebooks } from '../../lib/db';
import { X, Image, FileArchive, Download, Share2, HelpCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const store = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const activePageId = store.activePageId;
  const activeNotebookId = store.activeNotebookId;

  const handleExportPNG = async () => {
    if (!activePageId || !store.activePage) {
      toast.error('No active canvas page opened for image generation');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading('Synthesizing layers to PNG image...');
      
      await exportPageAsPNG(store.activePage, store.currentStrokes, { darkMode: store.darkMode });
      
      toast.dismiss();
      toast.success('PNG image downloaded successfully!');
      onClose();
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error('Failed to export canvas to PNG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!activePageId || !store.activePage) {
      toast.error('No active canvas page opened for PDF generation');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading('Synthesizing layers to PDF document...');
      
      await exportPageAsPDF(store.activePage, store.currentStrokes, { darkMode: store.darkMode });
      
      toast.dismiss();
      toast.success('PDF document downloaded successfully!');
      onClose();
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error('Failed to export canvas to PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZIP = async () => {
    if (!activeNotebookId) {
      toast.error('Choose a notebook from the sidebar to compile backup ZIP');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading('Compiling backup notebook archive to ZIP...');
      
      const notebooks = await listNotebooks();
      const notebook = notebooks.find(n => n.id === activeNotebookId);
      const name = notebook ? notebook.name : 'FYNotebook';
      
      await exportNotebookAsZIP(name, activeNotebookId, { darkMode: store.darkMode });
      
      toast.dismiss();
      toast.success('Backup ZIP downloaded successfully!');
      onClose();
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error('Failed to package notebook to ZIP');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 text-left p-1" id="export-actions-modal">
      
      {/* Pop title */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2E303B] pb-2.5">
        <div className="flex items-center space-x-1.5 text-brand-primary">
          <Download size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">Export & Backup Note</h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-text-primary focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col space-y-3.5">
        {/* Render option to export active page only */}
        <div className="p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-xl border border-gray-100 dark:border-[#2E303B] ivory:border-[#E8E1CE] flex flex-col space-y-1.5 transition-colors">
          <div className="flex items-center space-x-2">
            <div className="bg-brand-light dark:bg-brand-primary/10 text-brand-primary p-1.5 rounded-lg">
              <Image size={15} />
            </div>
            <span className="text-xs font-bold text-text-primary">Download current page as Image</span>
          </div>
          <p className="text-[10px] text-text-muted leading-tight pl-9">
            Renders absolute text boxes, drawing canvas strokes, markers and shape layers into a lossless high-fidelity portable PNG image.
          </p>
          <div className="pt-1.5 pl-9">
            <button
              onClick={handleExportPNG}
              disabled={isExporting || !activePageId}
              className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold rounded-lg disabled:opacity-40"
            >
              Export as PNG (.png)
            </button>
          </div>
        </div>

        {/* Option to export current page as PDF */}
        <div className="p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-xl border border-gray-100 dark:border-[#2E303B] ivory:border-[#E8E1CE] flex flex-col space-y-1.5 transition-colors">
          <div className="flex items-center space-x-2">
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-1.5 rounded-lg">
              <FileText size={15} />
            </div>
            <span className="text-xs font-bold text-text-primary">Download current page as PDF</span>
          </div>
          <p className="text-[10px] text-text-muted leading-tight pl-9">
            Renders absolute text boxes, drawing canvas strokes, markers and shape layers into a lossless high-fidelity portable PDF document.
          </p>
          <div className="pt-1.5 pl-9">
            <button
              onClick={handleExportPDF}
              disabled={isExporting || !activePageId}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-40"
            >
              Export as PDF (.pdf)
            </button>
          </div>
        </div>

        {/* Option to export whole notebook as backup format ZIP */}
        <div className="p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-xl border border-gray-100 dark:border-[#2E303B] ivory:border-[#E8E1CE] flex flex-col space-y-1.5 transition-colors">
          <div className="flex items-center space-x-2">
            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 p-1.5 rounded-lg">
              <FileArchive size={15} />
            </div>
            <span className="text-xs font-bold text-text-primary">Erase-safe Notebook compiler</span>
          </div>
          <p className="text-[10px] text-text-muted leading-tight pl-9">
            Bundles metadata, templates, handwritten vectors, voice records and study flashcards as a portable, standardized ZIP archive package for offline storage.
          </p>
          <div className="pt-1.5 pl-9">
            <button
              onClick={handleExportZIP}
              disabled={isExporting || !activeNotebookId}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg disabled:opacity-40"
            >
              Export Notebook ZIP (.zip)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
