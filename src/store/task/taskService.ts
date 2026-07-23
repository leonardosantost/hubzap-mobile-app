import { apiService } from '@/services/APIService';
import type { Agent, Contact } from '@/types';
import type { ConversationTask, CreateTaskPayload } from '@/types/Task';

type TaskApiResponse = {
  payload: {
    id: number;
    title?: string | null;
    description?: string | null;
    note?: string | null;
    due_at: string;
    status: 'pending' | 'completed';
    completed_at?: string | null;
    assignee?: Agent;
    contact?: { id: number; name: string | null; thumbnail: string | null };
    conversation?: {
      id: number;
      display_id: number;
      inbox_id: number;
      contact_name: string | null;
      status: string;
    };
  }[];
};

const transformTask = (task: TaskApiResponse['payload'][number]): ConversationTask => ({
  id: task.id,
  title: task.title ?? null,
  description: task.description ?? null,
  note: task.note ?? null,
  dueAt: task.due_at,
  status: task.status,
  completedAt: task.completed_at ?? null,
  assignee: task.assignee ?? null,
  contact: task.contact ?? null,
  conversation: task.conversation
    ? {
        id: task.conversation.id,
        displayId: task.conversation.display_id,
        inboxId: task.conversation.inbox_id,
        contactName: task.conversation.contact_name,
        status: task.conversation.status,
      }
    : null,
});

export class TaskService {
  static async getTasks(date: Date, assigneeId?: number): Promise<ConversationTask[]> {
    const response = await apiService.get<TaskApiResponse>('tasks', {
      params: {
        date: date.toISOString(),
        assignee_id: assigneeId || undefined,
      },
    });
    return response.data.payload.map(transformTask);
  }

  static async createTask(payload: CreateTaskPayload): Promise<void> {
    await apiService.post('tasks', {
      task: {
        title: payload.title,
        description: payload.description || undefined,
        due_at: payload.dueAt,
        assignee_id: payload.assigneeId || undefined,
        contact_id: payload.contactId || undefined,
        conversation_id: payload.conversationId || undefined,
      },
    });
  }

  static async completeTask(taskId: number): Promise<void> {
    await apiService.post(`tasks/${taskId}/complete`);
  }

  static async getAgents(): Promise<Agent[]> {
    const response = await apiService.get<Agent[]>('agents');
    return response.data;
  }

  static async searchContacts(query: string): Promise<Contact[]> {
    const response = await apiService.get<{ payload?: { contacts?: Contact[] } }>(
      'search/contacts',
      {
        params: { q: query, page: 1 },
      },
    );
    return response.data.payload?.contacts ?? [];
  }
}
