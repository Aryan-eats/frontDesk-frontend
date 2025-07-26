import { useState, useEffect, useCallback, useMemo } from 'react';

// Debounced search hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Search hook with debouncing and filtering
export const useSearch = <T>(
  items: T[],
  searchKey: keyof T | ((item: T) => string),
  initialQuery: string = '',
  debounceDelay: number = 300
) => {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, debounceDelay);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const searchTerm = debouncedQuery.toLowerCase();
    
    return items.filter(item => {
      const searchValue = typeof searchKey === 'function' 
        ? searchKey(item) 
        : String(item[searchKey] || '');
      
      return searchValue.toLowerCase().includes(searchTerm);
    });
  }, [items, debouncedQuery, searchKey]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    filteredItems,
    clearSearch,
    isSearching: query !== debouncedQuery,
  };
};

// Advanced search with multiple fields
export const useMultiFieldSearch = <T>(
  items: T[],
  searchFields: (keyof T | ((item: T) => string))[],
  initialQuery: string = '',
  debounceDelay: number = 300
) => {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, debounceDelay);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const searchTerm = debouncedQuery.toLowerCase();
    
    return items.filter(item => {
      return searchFields.some(field => {
        const searchValue = typeof field === 'function' 
          ? field(item) 
          : String(item[field] || '');
        
        return searchValue.toLowerCase().includes(searchTerm);
      });
    });
  }, [items, debouncedQuery, searchFields]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    filteredItems,
    clearSearch,
    isSearching: query !== debouncedQuery,
  };
};

// Keyboard shortcuts hook
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrlKey = event.ctrlKey || event.metaKey;
      
      // Build shortcut string
      let shortcut = '';
      if (ctrlKey) shortcut += 'ctrl+';
      if (event.shiftKey) shortcut += 'shift+';
      if (event.altKey) shortcut += 'alt+';
      shortcut += key;

      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }

      // Handle common shortcuts without modifiers
      if (shortcuts[key] && !ctrlKey && !event.shiftKey && !event.altKey) {
        // Only trigger if not in an input field
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          shortcuts[key]();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Local storage hook with caching
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  const clearValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, options]);

  return [setElement, isIntersecting] as const;
};
