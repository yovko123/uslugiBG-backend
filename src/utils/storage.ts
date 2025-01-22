// src/utils/storage.ts

declare global {
    interface Window {
      localStorage: Storage;
    }
  }
  
  interface StorageInterface {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
  }
  
  class StorageService implements StorageInterface {
    private storage: StorageInterface | null = null;
  
    constructor() {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.storage = window.localStorage;
      }
    }
  
    setItem(key: string, value: string): void {
      try {
        if (this.storage) {
          this.storage.setItem(key, value);
        }
      } catch (error) {
        console.warn('Storage is not available:', error);
      }
    }
  
    getItem(key: string): string | null {
      try {
        if (this.storage) {
          return this.storage.getItem(key);
        }
      } catch (error) {
        console.warn('Storage is not available:', error);
      }
      return null;
    }
  
    removeItem(key: string): void {
      try {
        if (this.storage) {
          this.storage.removeItem(key);
        }
      } catch (error) {
        console.warn('Storage is not available:', error);
      }
    }
  
    clear(): void {
      try {
        if (this.storage) {
          this.storage.clear();
        }
      } catch (error) {
        console.warn('Storage is not available:', error);
      }
    }
  }
  
  export const storage = new StorageService();