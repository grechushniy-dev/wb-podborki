import { useQuery } from '@tanstack/react-query';
import type { Collection, CollectionsFilters, Theme } from '@/types';

async function fetchCollections(filters: CollectionsFilters): Promise<Collection[]> {
  const params = new URLSearchParams();
  if (filters.themes.length > 0) params.set('theme', filters.themes.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.dateRange) {
    params.set('date_from', filters.dateRange[0]);
    params.set('date_to', filters.dateRange[1]);
  }
  if (filters.priceRange) {
    params.set('price_min', String(filters.priceRange[0]));
    params.set('price_max', String(filters.priceRange[1]));
  }

  const res = await fetch(`/api/collections?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch collections');
  const json = await res.json() as { data: Collection[] };
  return json.data;
}

async function fetchCollection(id: string): Promise<Collection> {
  const res = await fetch(`/api/collections/${id}`);
  if (!res.ok) throw new Error('Failed to fetch collection');
  const json = await res.json() as { data: Collection };
  return json.data;
}

async function fetchThemes(): Promise<Theme[]> {
  const res = await fetch('/api/collections/themes');
  if (!res.ok) throw new Error('Failed to fetch themes');
  const json = await res.json() as { data: Theme[] };
  return json.data;
}

export function useCollections(filters: CollectionsFilters) {
  return useQuery({
    queryKey: ['collections', filters],
    queryFn: () => fetchCollections(filters),
  });
}

export function useCollection(id: string | null) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: () => fetchCollection(id!),
    enabled: !!id,
  });
}

export function useThemes() {
  return useQuery({
    queryKey: ['themes'],
    queryFn: fetchThemes,
    staleTime: Infinity,
  });
}
