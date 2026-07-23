export type CatalogItemType = 'product' | 'service';

export type CatalogItem = {
  id: number;
  name: string;
  description: string | null;
  itemType: CatalogItemType;
  priceCents: number;
  currency: string;
  durationMinutes: number | null;
  active: boolean;
};

export type CatalogItemPayload = {
  name: string;
  description?: string;
  itemType: CatalogItemType;
  priceCents: number;
  currency?: string;
  durationMinutes?: number;
  active?: boolean;
};
