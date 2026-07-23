import { apiService } from '@/services/APIService';

export type EvolutionInbox = {
  id: number;
  name: string;
  channel_type: string;
  provider: string;
  evolution_instance_name?: string;
};

export type EvolutionConnection = {
  inbox_id: number;
  inbox_name: string;
  managed: boolean;
  instance_name?: string;
  state?: string;
  number?: string;
  profile_name?: string;
  profile_picture_url?: string;
  qrcode?: string;
};

export type EvolutionOverview = {
  configured: boolean;
  error?: string;
  inboxes: EvolutionInbox[];
  connections: EvolutionConnection[];
};

export class EvolutionApiService {
  static async overview(): Promise<EvolutionOverview> {
    // Temporary integration trace while wiring the backend in development.
    console.log('[EvolutionApiService] GET integrations/evolution_api');
    const response = await apiService.get<EvolutionOverview>('integrations/evolution_api');
    return response.data;
  }

  static async create(name: string): Promise<EvolutionConnection> {
    const response = await apiService.post<EvolutionConnection>('integrations/evolution_api', {
      name,
    });
    return response.data;
  }

  static async update(inboxId: number, name: string): Promise<EvolutionConnection> {
    const response = await apiService.put<EvolutionConnection>('integrations/evolution_api', {
      inbox_id: inboxId,
      name,
    });
    return response.data;
  }

  static async connect(inboxId: number): Promise<EvolutionConnection> {
    const response = await apiService.post<EvolutionConnection>(
      'integrations/evolution_api/connect',
      { inbox_id: inboxId },
    );
    return response.data;
  }

  static async reconnect(inboxId: number): Promise<EvolutionConnection> {
    const response = await apiService.post<EvolutionConnection>(
      'integrations/evolution_api/reconnect',
      { inbox_id: inboxId },
    );
    return response.data;
  }

  static async logout(inboxId: number): Promise<EvolutionConnection> {
    const response = await apiService.post<EvolutionConnection>(
      'integrations/evolution_api/logout',
      { inbox_id: inboxId },
    );
    return response.data;
  }

  static async destroy(inboxId: number): Promise<EvolutionConnection & { deleted?: boolean }> {
    const response = await apiService.delete<EvolutionConnection & { deleted?: boolean }>(
      'integrations/evolution_api',
      { data: { inbox_id: inboxId } },
    );
    return response.data;
  }

  static async status(inboxId: number): Promise<EvolutionConnection> {
    const response = await apiService.get<EvolutionConnection>('integrations/evolution_api/status', {
      params: { inbox_id: inboxId },
    });
    return response.data;
  }
}
