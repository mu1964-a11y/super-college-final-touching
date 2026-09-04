// storagePolyfill.ts - Safe polyfill for localStorage and sessionStorage under iframe sandbox constraints.
// This executes inline to prevent SecurityError / DOMException from crashing startup when third-party-storage is disabled.

(function initStoragePolyfill() {
  if (typeof window === 'undefined') return;

  function createMemoryStorage() {
    const memoryStore: Record<string, string> = {};
    return {
      getItem(key: string): string | null {
        return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
      },
      setItem(key: string, value: string): void {
        memoryStore[key] = String(value);
      },
      removeItem(key: string): void {
        delete memoryStore[key];
      },
      clear(): void {
        for (const key in memoryStore) {
          if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
            delete memoryStore[key];
          }
        }
      },
      key(index: number): string | null {
        return Object.keys(memoryStore)[index] || null;
      },
      get length(): number {
        return Object.keys(memoryStore).length;
      }
    };
  }

  // Define properties globally and on prototype safely
  function polyfillStorageProperty(propName: 'localStorage' | 'sessionStorage') {
    let nativeStorage: Storage | null = null;
    let isAccessible = false;

    try {
      // Test if native is readable/writable
      const raw = window[propName];
      if (raw) {
        const testKey = `__test_${propName}_accessibility__`;
        raw.setItem(testKey, '1');
        raw.removeItem(testKey);
        nativeStorage = raw;
        isAccessible = true;
      }
    } catch (e) {
      console.warn(`[Storage Polyfill] Native ${propName} is blocked or throws error:`, e);
    }

    if (!isAccessible) {
      console.warn(`[Storage Polyfill] Initializing in-memory fallback for ${propName}`);
      const fallbackStorage = createMemoryStorage() as unknown as Storage;

      // Define on Window.prototype if accessible
      try {
        const winProto = Object.getPrototypeOf(window) || Window.prototype;
        if (winProto) {
          Object.defineProperty(winProto, propName, {
            get() {
              return fallbackStorage;
            },
            configurable: true,
            enumerable: true
          });
        }
      } catch (e) {
        console.warn(`[Storage Polyfill] Could not define ${propName} on Window prototype:`, e);
      }

      // Define on window directly as fallback
      try {
        Object.defineProperty(window, propName, {
          get() {
            return fallbackStorage;
          },
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        console.warn(`[Storage Polyfill] Could not define ${propName} on window directly:`, e);
      }
    }
  }

  polyfillStorageProperty('localStorage');
  polyfillStorageProperty('sessionStorage');
})();
