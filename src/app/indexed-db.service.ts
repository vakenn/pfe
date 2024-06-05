import { Injectable, Inject, InjectionToken } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export const WINDOW = new InjectionToken<Window>('WindowToken', {
  providedIn: 'root',
  factory: () => window
});

interface MyDB extends DBSchema {
  files: {
    key: string;
    value: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private dbPromise: Promise<IDBPDatabase<MyDB>> | undefined;

  constructor(@Inject(WINDOW) private window: Window) {
    if (this.window.indexedDB) {
      this.dbPromise = openDB<MyDB>('my-database', 1, {
        upgrade(db) {
          db.createObjectStore('files');
        }
      });
    } else {
      console.warn('IndexedDB is not available in this environment.');
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const tx = db.transaction('files', 'readwrite');
    tx.store.put(value, key);
    await tx.done;
  }

  async getItem(key: string): Promise<string | undefined> {
    if (!this.dbPromise) return undefined;
    const db = await this.dbPromise;
    return await db.get('files', key);
  }

  async deleteItem(key: string): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const tx = db.transaction('files', 'readwrite');
    tx.store.delete(key);
    await tx.done;
  }

  async clear(): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const tx = db.transaction('files', 'readwrite');
    tx.store.clear();
    await tx.done;
  }
}
