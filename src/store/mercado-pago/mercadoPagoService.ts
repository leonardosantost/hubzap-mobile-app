import { apiService } from '@/services/APIService';

export type MercadoPagoOverview = {
  configured: boolean;
  connected: boolean;
  account_name?: string;
  account_email?: string;
  public_key_tail?: string;
  expires_at?: string;
  authorization_url?: string;
  error?: string;
};

export type MercadoPagoPaymentKind = 'pix' | 'payment_link';

export type MercadoPagoPaymentPayload = {
  kind: MercadoPagoPaymentKind;
  amount_cents: number;
  description: string;
  contact_id?: number;
  contact_name?: string;
  contact_email?: string;
  conversation_id?: number;
  items: {
    id: string | number;
    title: string;
    quantity: number;
    unit_price_cents: number;
  }[];
  notes?: string;
};

export type MercadoPagoPaymentResponse = {
  id: string;
  status?: string;
  checkout_url?: string;
  qr_code?: string;
  qr_code_base64?: string;
  expires_at?: string;
};

export class MercadoPagoService {
  static async overview(): Promise<MercadoPagoOverview> {
    const response = await apiService.get<MercadoPagoOverview>('integrations/mercado_pago');
    return response.data;
  }

  static async connect(): Promise<MercadoPagoOverview> {
    const response = await apiService.post<MercadoPagoOverview>(
      'integrations/mercado_pago/connect',
    );
    return response.data;
  }

  static async disconnect(): Promise<MercadoPagoOverview> {
    const response = await apiService.delete<MercadoPagoOverview>('integrations/mercado_pago');
    return response.data;
  }

  static async createPayment(
    payload: MercadoPagoPaymentPayload,
  ): Promise<MercadoPagoPaymentResponse> {
    const response = await apiService.post<MercadoPagoPaymentResponse>(
      'integrations/mercado_pago/payments',
      payload,
    );
    return response.data;
  }
}
