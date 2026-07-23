import { apiService } from '@/services/APIService';
import type { Agent, Contact } from '@/types';
import type { CatalogItem } from '@/types/CatalogItem';
import type { ConversationTask, CreateTaskPayload } from '@/types/Task';

type TaskApiResponse = {
  payload: {
    id: number;
    title?: string | null;
    description?: string | null;
    note?: string | null;
    due_at: string;
    status: 'pending' | 'completed';
    task_type?: 'task' | 'appointment';
    duration_minutes?: number | null;
    completed_at?: string | null;
    assignee?: Agent;
    contact?: { id: number; name: string | null; thumbnail: string | null };
    catalog_item?: CatalogItem & {
      item_type?: 'product' | 'service';
      price_cents?: number;
      duration_minutes?: number | null;
    };
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
  taskType: task.task_type ?? 'task',
  durationMinutes: task.duration_minutes ?? null,
  completedAt: task.completed_at ?? null,
  assignee: task.assignee ?? null,
  contact: task.contact ?? null,
  catalogItem: task.catalog_item
    ? {
        id: task.catalog_item.id,
        name: task.catalog_item.name,
        description: task.catalog_item.description ?? null,
        itemType: task.catalog_item.itemType ?? task.catalog_item.item_type ?? 'service',
        priceCents: Number(task.catalog_item.priceCents ?? task.catalog_item.price_cents ?? 0),
        currency: task.catalog_item.currency,
        durationMinutes:
          task.catalog_item.durationMinutes ?? task.catalog_item.duration_minutes ?? null,
        active: task.catalog_item.active,
      }
    : null,
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
  static async getTasks(
    date: Date,
    assigneeId?: number,
    taskType?: 'task' | 'appointment',
  ): Promise<ConversationTask[]> {
    const response = await apiService.get<TaskApiResponse>('tasks', {
      params: {
        date: date.toISOString(),
        assignee_id: assigneeId || undefined,
        task_type: taskType,
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
        task_type: payload.taskType || 'task',
        catalog_item_id: payload.catalogItemId || undefined,
        duration_minutes: payload.durationMinutes || undefined,
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
