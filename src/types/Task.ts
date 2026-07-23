import type { Agent } from './Agent';

export type TaskContact = {
  id: number;
  name: string | null;
  thumbnail: string | null;
};

export type ConversationTask = {
  id: number;
  title: string | null;
  description: string | null;
  note: string | null;
  dueAt: string;
  status: 'pending' | 'completed';
  completedAt: string | null;
  assignee: Agent | null;
  contact: TaskContact | null;
  conversation: {
    id: number;
    displayId: number;
    inboxId: number;
    contactName: string | null;
    status: string;
  } | null;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  dueAt: string;
  assigneeId?: number;
  contactId?: number;
  conversationId?: number;
};
