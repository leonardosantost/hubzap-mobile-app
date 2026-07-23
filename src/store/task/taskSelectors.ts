import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { taskSelectors } from './taskSlice';

const selectTaskState = (state: RootState) => state.tasks;

export const selectTasks = createSelector(selectTaskState, taskSelectors.selectAll);
export const selectTasksLoading = createSelector(selectTaskState, state => state.isLoading);
export const selectTasksSaving = createSelector(selectTaskState, state => state.isSaving);
export const selectTaskAgents = createSelector(selectTaskState, state => state.agents);
