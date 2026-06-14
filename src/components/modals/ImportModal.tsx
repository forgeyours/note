import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FolderDot, File, Image as ImageIcon, Archive } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { listFolders, saveFolder, saveNotebook, savePage, listPages } from '../../lib/db';
import { Folder, Notebook, Page } from '../../types';
import { importNotebookFromZIP } from '../../lib/exportEngine';
import { loadPDFJS } from '../../lib/pdfLoader';
import toast from 'react-hot-toast';

interface ImportModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export default function ImportModal({ onClose, onRefresh }: ImportModalProps) {
  const store = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('new');
  const [newFolderName, setNewFolderName] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    listFolders().then(setFolders).catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Importing ${selectedFile.name}...`, { id: 'importAction' });

      let targetFolderId = selectedFolderId;
      if (selectedFolderId === 'new') {
        targetFolderId = `folder-${Date.now()}-${Math.floor(Math.random() * 100)}`;
        const newFolder: Folder = {
          id: targetFolderId,
          name: newFolderName.trim() || 'Imported Files',
          color: '#E85D00',
          icon: '📦',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: folders.length
        };
        await saveFolder(newFolder);
      }

      let importedId = '';

      if (selectedFile.name.endsWith('.zip')) {
        importedId = await importNotebookFromZIP(selectedFile, targetFolderId);
      } else if (selectedFile.name.endsWith('.json')) {
        const text = await selectedFile.text();
        const data = JSON.parse(text);
        
        importedId = `notebook-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const nb: Notebook = {
          id: importedId,
          folderId: targetFolderId,
          name: data.name || selectedFile.name.replace('.json', ''),
          color: '#E85D00',
          coverStyle: 'plain',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: Date.now(),
          pageCount: data.pages?.length || 1
        };
        await saveNotebook(nb);

        if (data.pages && Array.isArray(data.pages)) {
          for (let i = 0; i < data.pages.length; i++) {
            const p = data.pages[i];
            const pageObj = p as Page;
            await savePage({
              ...pageObj,
              id: `page-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
              notebookId: importedId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      } else {
        // Assume PDF or Image
        importedId = `notebook-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const base64 = await toBase64(selectedFile);
        
        const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
        const isText = selectedFile.type.startsWith('text/') || selectedFile.name.match(/\.(txt|md|csv|json)$/i);
        
        let extractedText = '';
        if (isText && !selectedFile.name.toLowerCase().endsWith('.json')) {
           extractedText = await selectedFile.text();
        }

        let numPages = 1;
        if (isPdf) {
          try {
            const pdfjs = await loadPDFJS();
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            numPages = pdf.numPages;
          } catch (err) {
            console.error('Failed to parse PDF pages count', err);
          }
        }

        const nb: Notebook = {
          id: importedId,
          folderId: targetFolderId,
          name: selectedFile.name.replace(/\.[^/.]+$/, ""),
          color: isPdf ? '#3B82F6' : '#E85D00',
          coverStyle: 'plain',
          pdfSource: isPdf ? base64 : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: Date.now(),
          pageCount: numPages
        };
        await saveNotebook(nb);
        
        for (let i = 1; i <= numPages; i++) {
          const newPage: Page = {
            id: `page-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
            notebookId: importedId,
            title: isPdf ? `Page ${i}` : 'Imported Media',
            pageNumber: i,
            background: isPdf ? 'pdf' : 'plain',
            canvasData: '[]',
            textBlocks: (i === 1 && isText && extractedText) ? [{
              id: `txt-${Date.now()}`,
              x: 50, y: 50,
              width: 500,
              content: extractedText,
              fontSize: 16,
              color: '#1E2028',
              fontFamily: 'sans'
            }] : [],
            imageBlocks: (i === 1 && !isPdf && !isText) ? [{
              id: `img-${Date.now()}`,
              x: 50, y: 50,
              width: 400, height: 400,
              src: base64,
              alt: selectedFile.name
            }] : [],
            audioMarkers: [],
            shapeBlocks: [],
            pdfSource: null, // Keep pdfSource on Page records as null to avoid memory bloat
            pdfPage: isPdf ? i : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await savePage(newPage);
        }
      }

      toast.success('Successfully imported!', { id: 'importAction' });
      onRefresh();
      
      store.setActiveFolderId(targetFolderId);
      store.setActiveNotebookId(importedId);
      
      const pgs = await listPages(importedId);
      if (pgs.length > 0) {
        store.setActivePageId(pgs[0].id);
      }
      
      onClose();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import file', { id: 'importAction' });
    } finally {
      setIsImporting(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <UploadCloud size={24} className="text-gray-400" />;
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith('.zip')) return <Archive size={24} className="text-orange-500" />;
    if (name.endsWith('.pdf')) return <File size={24} className="text-red-500" />;
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return <ImageIcon size={24} className="text-blue-500" />;
    return <File size={24} className="text-gray-500" />;
  };

  return (
    <div className="flex flex-col space-y-4 text-left" id="import-notebook-modal">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center space-x-1.5 text-brand-primary">
          <UploadCloud size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">Open / Import</h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-text-primary focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col space-y-4 pt-1">
        
        {/* File Selection */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-bold text-text-muted">SELECT FILE</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-brand-primary/50 dark:border-[#2E303B] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors"
          >
            {getFileIcon()}
            <span className="text-sm font-medium text-text-primary mt-2 flex text-center">
              {selectedFile ? selectedFile.name : 'Click to browse files'}
            </span>
            <span className="text-[10px] text-text-muted mt-1 text-center">
              Supports .zip, .json, .pdf, .png, .jpg, .txt, .md
            </span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".zip,.json,.pdf,.png,.jpg,.jpeg,.txt,.md,.csv" 
            className="hidden" 
          />
        </div>

        {/* Destination Selection */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-bold text-text-muted">DESTINATION FOLDER</label>
          <select 
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full text-sm p-2 bg-bg-secondary border border-gray-200 dark:border-[#2E303B] rounded-lg outline-none focus:border-brand-primary transition-colors text-text-primary"
          >
            <option value="new">+ Create New Folder</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
            ))}
          </select>
          
          {selectedFolderId === 'new' && (
            <input 
              type="text" 
              placeholder="New folder name..." 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mt-2 w-full text-sm p-2 bg-bg-secondary border border-gray-200 dark:border-[#2E303B] rounded-lg outline-none focus:border-brand-primary transition-colors text-text-primary"
            />
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={!selectedFile || isImporting}
          className="w-full mt-2 bg-brand-primary hover:bg-[#CC5200] text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isImporting ? 'Importing...' : 'Import to Workspace'}
        </button>

      </div>
    </div>
  );
}
