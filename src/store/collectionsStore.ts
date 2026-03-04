import { create } from 'zustand';
import type { CollectionsFilters } from '@/types';

export type PageView = 'all' | 'my';

interface CollectionsStore {
  filters: CollectionsFilters;
  pageView: PageView;
  setFilters: (filters: Partial<CollectionsFilters>) => void;
  setPageView: (view: PageView) => void;
}

export const useCollectionsStore = create<CollectionsStore>((set) => ({
  filters: {
    themes: [],
    dateRange: null,
    search: '',
    priceRange: null,
  },
  pageView: 'all',

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  setPageView: (view) => set({ pageView: view }),
}));
