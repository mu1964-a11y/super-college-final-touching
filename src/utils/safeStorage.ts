// safeStorage.ts - Safe utility representing a reliable, try-catch secured key-value store.
// Falls back gracefully to an in-memory dictionary if iframe sandbox or third-party cookies block localStorage.

class SafeMemoryStorage {
  private memoryStore: Record<string, string> = {};

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.memoryStore, key) ? this.memoryStore[key] : null;
  }

  setItem(key: string, value: string): void {
    this.memoryStore[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.memoryStore[key];
  }

  clear(): void {
    this.memoryStore = {};
  }

  key(index: number): string | null {
    return Object.keys(this.memoryStore)[index] || null;
  }

  get length(): number {
    return Object.keys(this.memoryStore).length;
  }
}

// Private actual storage interface determined at engine boot
let activeStorage: Storage | SafeMemoryStorage;

function checkStorageAvailability(): boolean {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null) {
      const testKey = '__safe_storage_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    }
  } catch {
    // Perm Error / Security Exceptions caught silently
  }
  return false;
}

if (checkStorageAvailability()) {
  activeStorage = window.localStorage;
} else {
  console.warn("[Safe Storage Engine] Native localStorage is inaccessible under sandbox block rules. Activating stable memory-state backend.");
  activeStorage = new SafeMemoryStorage();
}

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return activeStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      activeStorage.setItem(key, value);
    } catch {
      // Graceful fail
    }
  },

  removeItem(key: string): void {
    try {
      activeStorage.removeItem(key);
    } catch {
      // Graceful fail
    }
  },

  clear(): void {
    try {
      activeStorage.clear();
    } catch {
      // Graceful fail
    }
  },

  key(index: number): string | null {
    try {
      return activeStorage.key(index);
    } catch {
      return null;
    }
  },

  get length(): number {
    try {
      return activeStorage.length;
    } catch {
      return 0;
    }
  },

  // Helper method to safely read keys without worrying about DOM exception
  keys(): string[] {
    const keysList: string[] = [];
    try {
      const len = activeStorage.length;
      for (let i = 0; i < len; i++) {
        const k = activeStorage.key(i);
        if (k !== null) {
          keysList.push(k);
        }
      }
    } catch {
      // Graceful fallback
    }
    return keysList;
  }
};
