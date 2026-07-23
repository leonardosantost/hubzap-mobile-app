import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Agent } from '@/types';
import type { ConversationTask } from '@/types/Task';
import { taskActions } from './taskActions';

const tasksAdapter = createEntityAdapter<ConversationTask>();

type TaskState = {
  isLoading: boolean;
  isSaving: boolean;
  agents: Agent[];
};

const initialState = tasksAdapter.getInitialState<TaskState>({
  isLoading: false,
  isSaving: false,
  agents: [],
});

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTasks: state => tasksAdapter.removeAll(state),
  },
  extraReducers: builder => {
    builder
      .addCase(taskActions.fetchTasks.pending, state => {
        state.isLoading = true;
      })
      .addCase(taskActions.fetchTasks.fulfilled, (state, action) => {
        tasksAdapter.setAll(state, action.payload);
        state.isLoading = false;
      })
      .addCase(taskActions.fetchTasks.rejected, state => {
        state.isLoading = false;
      })
      .addCase(taskActions.createTask.pending, state => {
        state.isSaving = true;
      })
      .addCase(taskActions.createTask.fulfilled, state => {
        state.isSaving = false;
      })
      .addCase(taskActions.createTask.rejected, state => {
        state.isSaving = false;
      })
      .addCase(taskActions.completeTask.fulfilled, (state, action: PayloadAction<number>) => {
        tasksAdapter.removeOne(state, action.payload);
      })
      .addCase(taskActions.fetchAgents.fulfilled, (state, action) => {
        state.agents = action.payload;
      });
  },
});

export const { clearTasks } = taskSlice.actions;
export const taskSelectors = tasksAdapter.getSelectors();
export default taskSlice.reducer;
