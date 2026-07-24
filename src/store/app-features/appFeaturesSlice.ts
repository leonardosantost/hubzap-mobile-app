import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type AppFeaturesState = {
  schedulingEnabled: boolean;
  schedulingAgentIds: number[];
  schedulingBusinessDays: number[];
  schedulingStartHour: number;
  schedulingEndHour: number;
  schedulingShowOverdueOnNextDay?: boolean;
};

const initialState: AppFeaturesState = {
  schedulingEnabled: false,
  schedulingAgentIds: [],
  schedulingBusinessDays: [1, 2, 3, 4, 5],
  schedulingStartHour: 8,
  schedulingEndHour: 18,
};

const ensureSchedulingState = (state: AppFeaturesState) => {
  state.schedulingAgentIds ??= [];
  state.schedulingBusinessDays ??= [1, 2, 3, 4, 5];
  state.schedulingStartHour ??= 8;
  state.schedulingEndHour ??= 18;
};

const appFeaturesSlice = createSlice({
  name: 'appFeatures',
  initialState,
  reducers: {
    setSchedulingEnabled: (state, action: PayloadAction<boolean>) => {
      state.schedulingEnabled = action.payload;
    },
    setSchedulingAgentIds: (state, action: PayloadAction<number[]>) => {
      ensureSchedulingState(state);
      state.schedulingAgentIds = action.payload;
    },
    toggleSchedulingAgent: (state, action: PayloadAction<number>) => {
      ensureSchedulingState(state);
      if (state.schedulingAgentIds.includes(action.payload)) {
        state.schedulingAgentIds = state.schedulingAgentIds.filter(id => id !== action.payload);
      } else {
        state.schedulingAgentIds.push(action.payload);
      }
    },
    toggleSchedulingBusinessDay: (state, action: PayloadAction<number>) => {
      ensureSchedulingState(state);
      if (state.schedulingBusinessDays.includes(action.payload)) {
        state.schedulingBusinessDays = state.schedulingBusinessDays.filter(
          day => day !== action.payload,
        );
      } else {
        state.schedulingBusinessDays.push(action.payload);
      }
      state.schedulingBusinessDays.sort((first, second) => first - second);
    },
    setSchedulingHours: (state, action: PayloadAction<{ startHour: number; endHour: number }>) => {
      ensureSchedulingState(state);
      state.schedulingStartHour = action.payload.startHour;
      state.schedulingEndHour = action.payload.endHour;
    },
    setSchedulingShowOverdueOnNextDay: (state, action: PayloadAction<boolean>) => {
      ensureSchedulingState(state);
      state.schedulingShowOverdueOnNextDay = action.payload;
    },
  },
});

export const {
  setSchedulingAgentIds,
  setSchedulingEnabled,
  setSchedulingHours,
  setSchedulingShowOverdueOnNextDay,
  toggleSchedulingAgent,
  toggleSchedulingBusinessDay,
} = appFeaturesSlice.actions;

export default appFeaturesSlice.reducer;
