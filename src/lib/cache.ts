
// src/lib/cache.ts

interface CachedItem<T> {
  expiry: number;
  value: T;
}

const CACHE_PREFIX = 'app_cache_'; // Added prefix

export function setCachedData<T>(key: string, data: T, ttlMinutes: number): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    const fullKey = CACHE_PREFIX + key; // Use prefix
    const expiry = new Date().getTime() + ttlMinutes * 60 * 1000;
    const item: CachedItem<T> = { value: data, expiry };
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting localStorage item "${fullKey}":`, error);
      // Optionally, you could implement a more sophisticated cache eviction strategy here
      // if QuotaExceededError is common, e.g., removing oldest items.
    }
  }
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    const fullKey = CACHE_PREFIX + key; // Use prefix
    try {
      const itemStr = window.localStorage.getItem(fullKey);
      if (!itemStr) {
        return null;
      }
      const item: CachedItem<T> = JSON.parse(itemStr);
      const now = new Date().getTime();
      if (now > item.expiry) {
        window.localStorage.removeItem(fullKey); // Cache expired, remove it
        return null;
      }
      return item.value;
    } catch (error) {
      console.error(`Error getting localStorage item "${fullKey}":`, error);
      // If parsing fails or any other error, treat as cache miss
      try {
        window.localStorage.removeItem(fullKey); // Attempt to remove corrupted item
      } catch (removeError) {
        console.error(`Error removing corrupted localStorage item "${fullKey}":`, removeError);
      }
      return null;
    }
  }
  return null;
}

export function removeCachedData(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    const fullKey = CACHE_PREFIX + key; // Use prefix
    try {
      window.localStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`Error removing localStorage item "${fullKey}":`, error);
    }
  }
}

export function clearAllAppCache(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      Object.keys(window.localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          window.localStorage.removeItem(key);
        }
      });
      console.log('All app-specific cache cleared from localStorage.');
    } catch (error) {
      console.error('Error clearing app cache from localStorage:', error);
    }
  }
}
