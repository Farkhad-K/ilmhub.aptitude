// src/utils/useLocalStorage.ts
import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialValue;
  });
  function set(v: T) {
    setState(v);
    localStorage.setItem(key, JSON.stringify(v));
  }
  return [state, set] as const;
}