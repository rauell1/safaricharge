'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUserPreference, setUserPreference } from '@/lib/supabase-db';

/**
 * Synced user preference hook.
 *
 * - Initialises synchronously from localStorage (no flash on render).
 * - Hydrates from Supabase on mount (authenticated users only).
 * - Writes to both localStorage and Supabase (fire-and-forget) on change.
 */
export function useUserPreference<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    getUserPreference<T>(key).then((remote) => {
      if (remote !== null) {
        setValue(remote);
        try { localStorage.setItem(key, JSON.stringify(remote)); } catch { /* ok */ }
      }
    });
  }, [key]);

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try { localStorage.setItem(key, JSON.stringify(newValue)); } catch { /* ok */ }
      void setUserPreference(key, newValue);
    },
    [key],
  );

  return [value, set];
}
