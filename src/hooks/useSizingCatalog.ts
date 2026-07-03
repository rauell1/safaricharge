'use client';

import { useEffect, useState } from 'react';
import type { SizingCatalog } from '@/lib/sizing/catalogTypes';

interface UseSizingCatalogResult {
  catalog: SizingCatalog | null;
  loading: boolean;
  error: string | null;
}

export function useSizingCatalog(): UseSizingCatalogResult {
  const [catalog, setCatalog] = useState<SizingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sizing-catalog')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load sizing catalog (${res.status})`);
        return res.json();
      })
      .then((data: SizingCatalog) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { catalog, loading, error };
}
