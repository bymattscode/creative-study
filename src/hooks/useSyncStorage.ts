import { useState, useEffect } from "react";

// Custom event to trigger updates across the app (in the same tab)
const STORAGE_EVENT_NAME = "on-synced-storage-update";

export function useSyncStorage<T>(
  key: string,
  initialValue: T,
): [T, (val: T | ((prevState: T) => T)) => void] {
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prevState: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Emitir evento customizado para avisar outros componentes na mesma aba
        window.dispatchEvent(
          new CustomEvent(STORAGE_EVENT_NAME, { detail: { key, newValue: valueToStore } }),
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.key === key) {
        setStoredValue(customEvent.detail.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(STORAGE_EVENT_NAME, handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(STORAGE_EVENT_NAME, handleCustomChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
