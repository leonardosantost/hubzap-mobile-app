import { apiService } from '@/services/APIService';

export type TeamChatStatus = {
  enabled: boolean;
  inboxId: number | null;
};

export class TeamChatService {
  static async getStatus(): Promise<TeamChatStatus> {
    const response = await apiService.get<{ enabled: boolean; inbox_id: number | null }>(
      'team_chat',
    );
    return { enabled: response.data.enabled, inboxId: response.data.inbox_id };
  }

  static async enable(): Promise<TeamChatStatus> {
    const response = await apiService.post<{ enabled: boolean; inbox_id: number }>('team_chat');
    return { enabled: response.data.enabled, inboxId: response.data.inbox_id };
  }
}
