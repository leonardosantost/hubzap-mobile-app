import { apiService } from '@/services/APIService';

export type TeamChatStatus = {
  enabled: boolean;
  inboxId: number | null;
  latestConversation: {
    id: number;
    teamName: string | null;
    updatedAt: number;
    message: {
      content: string | null;
      senderName: string | null;
      createdAt: number;
    } | null;
  } | null;
};

type TeamChatStatusResponse = {
  enabled: boolean;
  inbox_id: number | null;
  latest_conversation: {
    id: number;
    team_name: string | null;
    updated_at: number;
    message: {
      content: string | null;
      sender_name: string | null;
      created_at: number;
    } | null;
  } | null;
};

const toStatus = (data: TeamChatStatusResponse): TeamChatStatus => ({
  enabled: data.enabled,
  inboxId: data.inbox_id,
  latestConversation: data.latest_conversation
    ? {
        id: data.latest_conversation.id,
        teamName: data.latest_conversation.team_name,
        updatedAt: data.latest_conversation.updated_at,
        message: data.latest_conversation.message
          ? {
              content: data.latest_conversation.message.content,
              senderName: data.latest_conversation.message.sender_name,
              createdAt: data.latest_conversation.message.created_at,
            }
          : null,
      }
    : null,
});

export class TeamChatService {
  static async getStatus(): Promise<TeamChatStatus> {
    const response = await apiService.get<TeamChatStatusResponse>('team_chat');
    return toStatus(response.data);
  }

  static async enable(): Promise<TeamChatStatus> {
    const response = await apiService.post<TeamChatStatusResponse>('team_chat');
    return toStatus(response.data);
  }
}
