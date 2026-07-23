import { RootState } from '@/store';

const defaultBusinessDays = [1, 2, 3, 4, 5];
const defaultSchedulingHours = { startHour: 8, endHour: 18 };

export const selectSchedulingEnabled = (state: RootState) =>
  state.appFeatures?.schedulingEnabled ?? false;

export const selectSchedulingAgentIds = (state: RootState) =>
  state.appFeatures?.schedulingAgentIds ?? [];

export const selectSchedulingBusinessDays = (state: RootState) =>
  state.appFeatures?.schedulingBusinessDays ?? defaultBusinessDays;

export const selectSchedulingStartHour = (state: RootState) =>
  state.appFeatures?.schedulingStartHour ?? defaultSchedulingHours.startHour;

export const selectSchedulingEndHour = (state: RootState) =>
  state.appFeatures?.schedulingEndHour ?? defaultSchedulingHours.endHour;
