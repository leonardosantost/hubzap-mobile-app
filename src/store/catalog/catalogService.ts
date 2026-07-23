import { apiService } from '@/services/APIService';
import type { CatalogItem, CatalogItemPayload } from '@/types/CatalogItem';

type CatalogItemApi = {
  id: number;
  name: string;
  description?: string | null;
  item_type: 'product' | 'service';
  price_cents: number;
  currency: string;
  duration_minutes?: number | null;
  active: boolean;
};

type CatalogItemsResponse = {
  payload: CatalogItemApi[];
};

type CatalogItemResponse = {
  payload: CatalogItemApi;
};

const transformCatalogItem = (item: CatalogItemApi): CatalogItem => ({
  id: item.id,
  name: item.name,
  description: item.description ?? null,
  itemType: item.item_type,
  priceCents: Number(item.price_cents || 0),
  currency: item.currency,
  durationMinutes: item.duration_minutes ?? null,
  active: item.active,
});

const toApiPayload = (payload: CatalogItemPayload) => ({
  catalog_item: {
    name: payload.name,
    description: payload.description || undefined,
    item_type: payload.itemType,
    price_cents: payload.priceCents,
    currency: payload.currency || 'BRL',
    duration_minutes: payload.durationMinutes || undefined,
    active: payload.active ?? true,
  },
});

export class CatalogService {
  static async list(itemType?: 'product' | 'service'): Promise<CatalogItem[]> {
    const response = await apiService.get<CatalogItemsResponse>('catalog_items', {
      params: {
        item_type: itemType,
        active: true,
      },
    });
    return response.data.payload.map(transformCatalogItem);
  }

  static async create(payload: CatalogItemPayload): Promise<CatalogItem> {
    const response = await apiService.post<CatalogItemResponse>(
      'catalog_items',
      toApiPayload(payload),
    );
    return transformCatalogItem(response.data.payload);
  }

  static async update(id: number, payload: CatalogItemPayload): Promise<CatalogItem> {
    const response = await apiService.put<CatalogItemResponse>(
      `catalog_items/${id}`,
      toApiPayload(payload),
    );
    return transformCatalogItem(response.data.payload);
  }

  static async remove(id: number): Promise<void> {
    await apiService.delete(`catalog_items/${id}`);
  }
}
