/**
 * Storage Utility Module
 * 
 * Unified localStorage access with error handling and fallbacks
 */

/**
 * Storage utility with JSON serialization and error handling
 */
export const store = {
  /**
   * Get a value from localStorage
   * @template T
   * @param {string} key - Storage key
   * @param {T} defaultValue - Default value if key doesn't exist
   * @returns {T} The stored value or default
   */
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set a value in localStorage
   * @param {string} key - Storage key
   * @param {unknown} value - Value to store (will be JSON serialized)
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to localStorage (${key}):`, error);
    }
  },

  /**
   * Remove a value from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage (${key}):`, error);
    }
  },

  /**
   * Clear all localStorage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },

  /**
   * Get all keys from localStorage
   * @returns {string[]} Array of keys
   */
  keys() {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },

  /**
   * Check if a key exists in localStorage
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }
};

/**
 * SessionStorage utility (similar to store but for sessionStorage)
 */
export const sessionStore = {
  get(key, defaultValue) {
    try {
      const item = sessionStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to sessionStorage (${key}):`, error);
    }
  },

  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from sessionStorage (${key}):`, error);
    }
  },

  clear() {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }
};

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
export function isLocalStorageAvailable() {
  try {
    const testKey = '__intalks_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * In-memory storage fallback when localStorage is unavailable
 * (e.g., in private browsing mode or when disabled)
 */
class MemoryStore {
  constructor() {
    /** @type {Record<string, unknown>} */
    this.data = {};
  }

  get(key, defaultValue) {
    return this.data.hasOwnProperty(key) ? this.data[key] : defaultValue;
  }

  set(key, value) {
    this.data[key] = value;
  }

  remove(key) {
    delete this.data[key];
  }

  clear() {
    this.data = {};
  }

  keys() {
    return Object.keys(this.data);
  }

  has(key) {
    return this.data.hasOwnProperty(key);
  }
}

/** @type {MemoryStore} */
let memoryFallback = null;

/**
 * Get a storage instance that falls back to memory when localStorage is unavailable
 * @returns {import('./storage.js').store}
 */
export function getSafeStorage() {
  if (isLocalStorageAvailable()) {
    return store;
  }
  
  if (!memoryFallback) {
    memoryFallback = new MemoryStore();
    console.warn('Using in-memory storage fallback (localStorage unavailable)');
  }
  
  return memoryFallback;
}

// Export default for backwards compatibility
export default store;
