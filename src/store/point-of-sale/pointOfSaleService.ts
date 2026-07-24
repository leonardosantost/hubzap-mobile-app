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

type PosOrderApiItem = {
  id: number;
  catalog_item_id?: number | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

type PosOrderApiResource = {
  id: number;
  account_id: number;
  contact_id?: number | null;
  conversation_id?: number | null;
  created_by_id?: number | null;
  customer_name: string;
  status: PosOrderStatus;
  payment_status: PosOrderPaymentStatus;
  payment_method?: string | null;
  payment_provider?: string | null;
  payment_provider_id?: string | null;
  payment_checkout_url?: string | null;
  payment_qr_code?: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    thumbnail?: string | null;
  } | null;
  created_by?: {
    id: number;
    name?: string | null;
    email?: string | null;
    thumbnail?: string | null;
  } | null;
  items?: PosOrderApiItem[];
};

type PosOrderApiResponse = {
  payload: PosOrderApiResource;
};

type PosOrdersApiResponse = {
  payload: PosOrderApiResource[];
};

export type PosOrderStatus = 'draft' | 'open' | 'completed' | 'cancelled';
export type PosOrderPaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'expired';

export type PosOrderItem = {
  id: number;
  catalogItemId?: number | null;
  name: string;
  description?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PosOrder = {
  id: number;
  accountId: number;
  contactId?: number | null;
  conversationId?: number | null;
  createdById?: number | null;
  customerName: string;
  status: PosOrderStatus;
  paymentStatus: PosOrderPaymentStatus;
  paymentMethod?: string | null;
  paymentProvider?: string | null;
  paymentProviderId?: string | null;
  paymentCheckoutUrl?: string | null;
  paymentQrCode?: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: number;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    thumbnail?: string | null;
  } | null;
  createdBy?: {
    id: number;
    name?: string | null;
    email?: string | null;
    thumbnail?: string | null;
  } | null;
  items: PosOrderItem[];
};

export type PosOrderInputItem = {
  id?: number;
  catalogItemId?: number | null;
  name: string;
  description?: string | null;
  quantity: number;
  unitPriceCents: number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

export type PosOrderInput = {
  contactId?: number;
  conversationId?: number;
  customerName: string;
  status: PosOrderStatus;
  paymentStatus: PosOrderPaymentStatus;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentProviderId?: string;
  paymentCheckoutUrl?: string;
  paymentQrCode?: string;
  discountCents?: number;
  shippingCents?: number;
  currency?: string;
  notes?: string;
  items: PosOrderInputItem[];
  metadata?: Record<string, unknown>;
};

export type PosOrderFilters = {
  contactId?: number;
  conversationId?: number;
  status?: PosOrderStatus;
  paymentStatus?: PosOrderPaymentStatus;
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

const toOrderItem = (item: PosOrderApiItem): PosOrderItem => ({
  id: item.id,
  catalogItemId: item.catalog_item_id,
  name: item.name,
  description: item.description,
  quantity: item.quantity,
  unitPriceCents: item.unit_price_cents,
  totalCents: item.total_cents,
  currency: item.currency,
  metadata: item.metadata,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const toOrder = (order: PosOrderApiResource): PosOrder => ({
  id: order.id,
  accountId: order.account_id,
  contactId: order.contact_id,
  conversationId: order.conversation_id,
  createdById: order.created_by_id,
  customerName: order.customer_name,
  status: order.status,
  paymentStatus: order.payment_status,
  paymentMethod: order.payment_method,
  paymentProvider: order.payment_provider,
  paymentProviderId: order.payment_provider_id,
  paymentCheckoutUrl: order.payment_checkout_url,
  paymentQrCode: order.payment_qr_code,
  subtotalCents: order.subtotal_cents,
  discountCents: order.discount_cents,
  shippingCents: order.shipping_cents,
  totalCents: order.total_cents,
  currency: order.currency,
  notes: order.notes,
  metadata: order.metadata,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  contact: order.contact
    ? {
        id: order.contact.id,
        name: order.contact.name,
        email: order.contact.email,
        phoneNumber: order.contact.phone_number,
        thumbnail: order.contact.thumbnail,
      }
    : null,
  createdBy: order.created_by,
  items: order.items?.map(toOrderItem) || [],
});

const toOrderPayload = (order: PosOrderInput) => ({
  pos_order: {
    contact_id: order.contactId,
    conversation_id: order.conversationId,
    customer_name: order.customerName,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    payment_provider: order.paymentProvider,
    payment_provider_id: order.paymentProviderId,
    payment_checkout_url: order.paymentCheckoutUrl,
    payment_qr_code: order.paymentQrCode,
    discount_cents: order.discountCents || 0,
    shipping_cents: order.shippingCents || 0,
    currency: order.currency || 'BRL',
    notes: order.notes,
    metadata: order.metadata || {},
    pos_order_items_attributes: order.items.map(item => ({
      id: item.id,
      catalog_item_id: item.catalogItemId,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      currency: item.currency || 'BRL',
      metadata: item.metadata || {},
    })),
  },
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

  static async getOrders(filters: PosOrderFilters = {}): Promise<PosOrder[]> {
    const response = await apiService.get<PosOrdersApiResponse>('pos_orders', {
      params: {
        contact_id: filters.contactId,
        conversation_id: filters.conversationId,
        status: filters.status,
        payment_status: filters.paymentStatus,
      },
    });

    return response.data.payload.map(toOrder);
  }

  static async createOrder(order: PosOrderInput): Promise<PosOrder> {
    const response = await apiService.post<PosOrderApiResponse>(
      'pos_orders',
      toOrderPayload(order),
    );
    return toOrder(response.data.payload);
  }

  static async updateOrder(orderId: number, order: PosOrderInput): Promise<PosOrder> {
    const response = await apiService.put<PosOrderApiResponse>(
      `pos_orders/${orderId}`,
      toOrderPayload(order),
    );
    return toOrder(response.data.payload);
  }

  static async completeOrder(orderId: number): Promise<PosOrder> {
    const response = await apiService.post<PosOrderApiResponse>(`pos_orders/${orderId}/complete`);
    return toOrder(response.data.payload);
  }

  static async cancelOrder(orderId: number): Promise<PosOrder> {
    const response = await apiService.post<PosOrderApiResponse>(`pos_orders/${orderId}/cancel`);
    return toOrder(response.data.payload);
  }
}
