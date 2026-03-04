export type CollectionStatus = 'draft' | 'moderation' | 'active' | 'closed' | 'archived';
export type ApplicationStatus = 'pending' | 'approved' | 'confirmed' | 'shipped' | 'rejected' | 'published' | 'completed';

export interface Theme {
  id: string;
  name: string;
}

export interface BloggerSlot {
  id: string;
  blogger_id: string;
  blogger_name: string;
  blogger_avatar: string;
  blogger_profile_url: string;
  blogger_publications_count: number;
  blogger_avg_views: number;
  blogger_rating: number;
  allowed_categories: string[];
  price_per_slot: number;
  total_slots: number;
  available_slots: number;
  publication_date: string;
}

export interface Collection {
  id: string;
  title: string;
  theme_ids: string[];
  theme_names: string[];
  description: string;
  deadline_at: string;
  status: CollectionStatus;
  slots: BloggerSlot[];
  created_at: string;
  updated_at: string;
}

export interface ProductStats {
  product_id: string;
  views: number;
  orders: number;
  likes: number;
  revenue: number;
}

export interface ApplicationStats {
  views: number;
  orders: number;
  likes: number;
  revenue: number;
  by_product: ProductStats[];
}

export interface Application {
  id: string;
  collection_id: string;
  slot_id: string;
  collection_title: string;
  collection_publication_date: string;
  blogger_name: string;
  blogger_avatar: string;
  seller_id: string;
  offered_price: number;
  gift_product: boolean;
  gift_product_ids: string[];
  product_ids: string[];
  status: ApplicationStatus;
  accepted_product_ids: string[] | null; // null = ещё не решено, [] = никакие, [...] = принятые
  confirmed_at: string | null;
  shipped_at: string | null;
  post_url: string | null;
  published_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  stats: ApplicationStats | null;
}

export interface SellerProduct {
  id: string;
  article: string;
  name: string;
  category: string;
  image_url: string;
  price: number;
}

export interface CollectionsFilters {
  themes: string[];
  dateRange: [string, string] | null;
  search: string;
  priceRange: [number, number] | null;
}

export interface SubmitApplicationPayload {
  collection_id: string;
  slot_id: string;
  offered_price: number;
  gift_product: boolean;
  gift_product_ids: string[];
  product_ids: string[];
}
