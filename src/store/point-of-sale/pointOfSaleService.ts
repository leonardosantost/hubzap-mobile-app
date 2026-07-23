import { apiService } from '@/services/APIService';

type ProductCatalogApiProduct = {
  id: string;
  retailer_id?: string | null;
  name: string;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  images?: string[];
  availability?: string | null;
  brand?: string | null;
  collections?: string[];
  url?: string | null;
};

type ProductCatalogApiResponse = {
  catalog?: {
    id?: string;
    name?: string | null;
  };
  collections?: string[];
  products?: ProductCatalogApiProduct[];
  fetched_at?: string;
};

export type ProductCatalogProduct = {
  id: string;
  retailerId?: string | null;
  name: string;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  imageUrl?: string | null;
  images: string[];
  availability?: string | null;
  brand?: string | null;
  collections: string[];
  url?: string | null;
};

export type ProductCatalog = {
  catalogName?: string | null;
  collections: string[];
  products: ProductCatalogProduct[];
  fetchedAt?: string;
};

const toProduct = (product: ProductCatalogApiProduct): ProductCatalogProduct => ({
  id: product.id,
  retailerId: product.retailer_id,
  name: product.name,
  description: product.description,
  price: product.price,
  currency: product.currency,
  imageUrl: product.image_url,
  images: product.images || [],
  availability: product.availability,
  brand: product.brand,
  collections: product.collections || [],
  url: product.url,
});

export class PointOfSaleService {
  static async getProductCatalog(): Promise<ProductCatalog> {
    const response = await apiService.get<ProductCatalogApiResponse>(
      'integrations/product_catalog',
    );

    return {
      catalogName: response.data.catalog?.name,
      collections: response.data.collections || [],
      products: response.data.products?.map(toProduct) || [],
      fetchedAt: response.data.fetched_at,
    };
  }
}
