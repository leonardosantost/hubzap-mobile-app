import { createAsyncThunk } from '@reduxjs/toolkit';
import type { CreateTaskPayload, ConversationTask } from '@/types/Task';
import type { Agent } from '@/types';
import { TaskService } from './taskService';

export const taskActions = {
  fetchTasks: createAsyncThunk<ConversationTask[], { date: Date; assigneeId?: number }>(
    'tasks/fetchTasks',
    ({ date, assigneeId }) => TaskService.getTasks(date, assigneeId),
  ),
  createTask: createAsyncThunk<void, CreateTaskPayload>('tasks/createTask', TaskService.createTask),
  completeTask: createAsyncThunk<number, number>('tasks/completeTask', async taskId => {
    await TaskService.completeTask(taskId);
    return taskId;
  }),
  fetchAgents: createAsyncThunk<Agent[]>('tasks/fetchAgents', TaskService.getAgents),
};
