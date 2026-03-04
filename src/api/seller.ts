import { useQuery } from '@tanstack/react-query';
import type { SellerProduct } from '@/types';

async function fetchSellerProducts(categories: string[]): Promise<SellerProduct[]> {
  const params = new URLSearchParams();
  if (categories.length > 0) params.set('category', categories.join(','));
  const res = await fetch(`/api/seller/products?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  const json = await res.json() as { data: SellerProduct[] };
  return json.data;
}

export function useSellerProducts(categories: string[]) {
  return useQuery({
    queryKey: ['seller-products', categories],
    queryFn: () => fetchSellerProducts(categories),
    enabled: categories.length > 0,
  });
}

export function useAllSellerProducts() {
  return useQuery({
    queryKey: ['seller-products-all'],
    queryFn: () => fetchSellerProducts([]),
  });
}
