/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { listFolders, saveFolder, saveNotebook, savePage, saveFlashcardDeck, getDB } from '../lib/db';
import { Folder, Notebook, Page, FlashcardDeck } from '../types';

export async function initializeDefaultData(): Promise<void> {
  const folders = await listFolders();
  
  // FORCE AUTO-RESET OF OLD CLUTTER IF 'College Semester 1' IS STILL PRESENT in active DB
  const hasOldClutter = folders.some((f) => f.name === 'College Semester 1' || f.name.includes('Physics 101 Notes'));
  if (hasOldClutter) {
    console.log("Detecting old cluttered seeded database. Force clearing workspace for a clean slate...");
    try {
      const db = await getDB();
      const stores = ['folders', 'notebooks', 'pages', 'audio', 'flashcards'];
      await new Promise<void>((resolve) => {
        const transaction = db.transaction(stores, 'readwrite');
        stores.forEach((storeName) => {
          try {
            transaction.objectStore(storeName).clear();
          } catch (e) {
            console.error(e);
          }
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      });
      // Set indicator to reload so that the fresh seed initializes cleanly
      window.location.reload();
      return;
    } catch (err) {
      console.error("Failed to clear old cluttered DB:", err);
    }
  }

  if (folders.length > 0) {
    // Already initialized
    return;
  }

  // 1. Create Folder
  const welcomeFolder: Folder = {
    id: `folder-1`,
    name: 'My Workspace',
    color: '#E85D00',
    icon: '📚',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0
  };
  await saveFolder(welcomeFolder);

  // 2. Create Notebook inside welcomeFolder
  const welcomeNotebook: Notebook = {
    id: `notebook-1`,
    folderId: welcomeFolder.id,
    name: 'My Notebook',
    color: '#E85D00',
    coverStyle: 'ruled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
    pageCount: 1
  };
  await saveNotebook(welcomeNotebook);

  // 3. Create a clean, empty page inside the Notebook
  const page1: Page = {
    id: `page-1`,
    notebookId: welcomeNotebook.id,
    title: 'Page 1',
    pageNumber: 1,
    background: 'ruled',
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

  await savePage(page1);
}
