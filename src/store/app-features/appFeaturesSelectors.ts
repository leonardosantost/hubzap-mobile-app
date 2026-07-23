import { RootState } from '@/store';

const defaultBusinessDays = [1, 2, 3, 4, 5];

export const selectSchedulingEnabled = (state: RootState) =>
  state.appFeatures?.schedulingEnabled ?? false;

export const selectSchedulingAgentIds = (state: RootState) =>
  state.appFeatures?.schedulingAgentIds ?? [];

export const selectSchedulingBusinessDays = (state: RootState) =>
  state.appFeatures?.schedulingBusinessDays ?? defaultBusinessDays;

export const selectSchedulingHours = (state: RootState) => ({
  startHour: state.appFeatures?.schedulingStartHour ?? 8,
  endHour: state.appFeatures?.schedulingEndHour ?? 18,
});
