import { Injectable } from '@angular/core';
import { House } from '../core/models/house.model';

const DB_NAME = 'home-studio';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const CURRENT_KEY = 'current';

@Injectable({ providedIn: 'root' })
export class ProjectDb {
  async load(): Promise<House | null> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(CURRENT_KEY);
        request.onsuccess = () => {
          resolve((request.result as House | undefined) ?? null);
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async save(house: House): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE_NAME).put(house, CURRENT_KEY);
      });
    } finally {
      db.close();
    }
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
