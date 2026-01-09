/**
 * Custom hook for managing localStorage with TypeScript type safety
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for persisting state in localStorage
 *
 * @param key - localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * const [timeout, setTimeout] = useLocalStorage('tableChat:queryTimeout', 30);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch (error) {
          console.warn(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Hook specifically for query timeout settings
 *
 * Includes validation to ensure timeout is within acceptable range (10-300 seconds)
 *
 * @returns Tuple of [timeoutSeconds, setTimeoutSeconds]
 */
export function useQueryTimeout(): [number, (timeout: number) => void] {
  const [timeout, setTimeoutRaw] = useLocalStorage<number>('tableChat:queryTimeout', 30);

  const setTimeout = useCallback(
    (value: number) => {
      // Validate range: 10-300 seconds
      if (value < 10) {
        console.warn('Query timeout must be at least 10 seconds, setting to 10');
        setTimeoutRaw(10);
      } else if (value > 300) {
        console.warn('Query timeout must be at most 300 seconds, setting to 300');
        setTimeoutRaw(300);
      } else {
        setTimeoutRaw(value);
      }
    },
    [setTimeoutRaw]
  );

  // Validate current value on mount
  useEffect(() => {
    if (timeout < 10 || timeout > 300) {
      setTimeout(30); // Reset to default if invalid
    }
  }, []); // Run only on mount

  return [timeout, setTimeout];
}
