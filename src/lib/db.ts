/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Folder, Notebook, Page, AudioRecording, FlashcardDeck } from '../types';

const DB_NAME = 'forgeyours-note';
const DB_VERSION = 1;

export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notebooks')) {
        const notebookStore = db.createObjectStore('notebooks', { keyPath: 'id' });
        notebookStore.createIndex('folderId', 'folderId', { unique: false });
      }
      if (!db.objectStoreNames.contains('pages')) {
        const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
        pageStore.createIndex('notebookId', 'notebookId', { unique: false });
      }
      if (!db.objectStoreNames.contains('audio')) {
        const audioStore = db.createObjectStore('audio', { keyPath: 'id' });
        audioStore.createIndex('pageId', 'pageId', { unique: false });
      }
      if (!db.objectStoreNames.contains('flashcards')) {
        const flashcardStore = db.createObjectStore('flashcards', { keyPath: 'id' });
        flashcardStore.createIndex('notebookId', 'notebookId', { unique: false });
      }
    };
  });
}

// Helper wrapper to run transactions
function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  return getDB().then((db) => {
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      transaction.oncomplete = () => {
        if (request) {
          resolve(request.result);
        } else {
          resolve(undefined as T);
        }
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      if (request) {
        request.onerror = () => {
          reject(request.error);
        };
      }
    });
  });
}

// FOLDERS CRUD
export function listFolders(): Promise<Folder[]> {
  return runTransaction<Folder[]>('folders', 'readonly', (store) => store.getAll())
    .then((folders) => folders.sort((a, b) => a.order - b.order));
}

export function saveFolder(folder: Folder): Promise<void> {
  return runTransaction<void>('folders', 'readwrite', (store) => {
    store.put(folder);
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  // First, delete folders
  await runTransaction<void>('folders', 'readwrite', (store) => {
    store.delete(folderId);
  });
  
  // Recursively delete all notebooks inside this folder
  const notebooks = await listNotebooks(folderId);
  for (const nb of notebooks) {
    await deleteNotebook(nb.id);
  }
}

// NOTEBOOKS CRUD
export function listNotebooks(folderId?: string): Promise<Notebook[]> {
  return getDB().then((db) => {
    return new Promise<Notebook[]>((resolve, reject) => {
      const transaction = db.transaction('notebooks', 'readonly');
      const store = transaction.objectStore('notebooks');
      let request: IDBRequest;

      if (folderId) {
        const index = store.index('folderId');
        request = index.getAll(folderId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const notebooks = request.result as Notebook[];
        resolve(notebooks.sort((a, b) => a.order - b.order));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function saveNotebook(notebook: Notebook): Promise<void> {
  return runTransaction<void>('notebooks', 'readwrite', (store) => {
    store.put(notebook);
  });
}

export function getNotebook(notebookId: string): Promise<Notebook | undefined> {
  return runTransaction<Notebook>('notebooks', 'readonly', (store) => store.get(notebookId));
}

export async function deleteNotebook(notebookId: string): Promise<void> {
  await runTransaction<void>('notebooks', 'readwrite', (store) => {
    store.delete(notebookId);
  });

  // Delete all pages in this notebook
  const pages = await listPages(notebookId);
  for (const page of pages) {
    await deletePage(page.id);
  }

  // Delete flashcard decks
  const decks = await listFlashcardDecks(notebookId);
  for (const deck of decks) {
    await deleteFlashcardDeck(deck.id);
  }
}

// PAGES CRUD
export function listPages(notebookId?: string): Promise<Page[]> {
  return getDB().then((db) => {
    return new Promise<Page[]>((resolve, reject) => {
      const transaction = db.transaction('pages', 'readonly');
      const store = transaction.objectStore('pages');
      let request: IDBRequest;

      if (notebookId) {
        const index = store.index('notebookId');
        request = index.getAll(notebookId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const pages = request.result as Page[];
        resolve(pages.sort((a, b) => a.pageNumber - b.pageNumber));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function getPage(pageId: string): Promise<Page | undefined> {
  return runTransaction<Page>('pages', 'readonly', (store) => store.get(pageId));
}

export function savePage(page: Page): Promise<void> {
  return runTransaction<void>('pages', 'readwrite', (store) => {
    store.put(page);
  }).then(() => {
    // Dynamically update page count on notebook
    updateNotebookPageCount(page.notebookId);
  });
}

export async function deletePage(pageId: string): Promise<void> {
  const page = await getPage(pageId);
  const notebookId = page?.notebookId;

  await runTransaction<void>('pages', 'readwrite', (store) => {
    store.delete(pageId);
  });

  // Delete associated audio
  if (page) {
    await deleteAudioByPageId(pageId);
  }

  if (notebookId) {
    await updateNotebookPageCount(notebookId);
  }
}

async function updateNotebookPageCount(notebookId: string): Promise<void> {
  const pages = await listPages(notebookId);
  const notebooksStore = await runTransaction<Notebook | undefined>('notebooks', 'readonly', (store) => store.get(notebookId));
  if (notebooksStore) {
    notebooksStore.pageCount = pages.length;
    notebooksStore.updatedAt = new Date().toISOString();
    await saveNotebook(notebooksStore);
  }
}

// AUDIO STORE
export function saveAudio(recording: AudioRecording): Promise<void> {
  return runTransaction<void>('audio', 'readwrite', (store) => {
    store.put(recording);
  });
}

export function getAudio(audioId: string): Promise<AudioRecording | undefined> {
  return runTransaction<AudioRecording>('audio', 'readonly', (store) => store.get(audioId));
}

export function deleteAudio(audioId: string): Promise<void> {
  return runTransaction<void>('audio', 'readwrite', (store) => {
    store.delete(audioId);
  });
}

async function deleteAudioByPageId(pageId: string): Promise<void> {
  return getDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('audio', 'readwrite');
      const store = transaction.objectStore('audio');
      const index = store.index('pageId');
      const request = index.openCursor(pageId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

// FLASHCARDS STORE
export function listFlashcardDecks(notebookId?: string): Promise<FlashcardDeck[]> {
  return getDB().then((db) => {
    return new Promise<FlashcardDeck[]>((resolve, reject) => {
      const transaction = db.transaction('flashcards', 'readonly');
      const store = transaction.objectStore('flashcards');
      let request: IDBRequest;

      if (notebookId) {
        const index = store.index('notebookId');
        request = index.getAll(notebookId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        resolve(request.result as FlashcardDeck[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export function saveFlashcardDeck(deck: FlashcardDeck): Promise<void> {
  return runTransaction<void>('flashcards', 'readwrite', (store) => {
    store.put(deck);
  });
}

export function deleteFlashcardDeck(deckId: string): Promise<void> {
  return runTransaction<void>('flashcards', 'readwrite', (store) => {
    store.delete(deckId);
  });
}

// STORAGE INDICATOR
export async function getStorageUsage(): Promise<{ bytes: number; human: string }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      return {
        bytes: usage,
        human: formatBytes(usage),
      };
    }
  } catch (e) {
    console.error('Failed to estimate storage', e);
  }
  
  // Alternative fallback estimation (approx size of db stores if possible)
  return { bytes: 5242880, human: '5.0 MB (estimated)' };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
