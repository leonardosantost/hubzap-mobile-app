import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import InboxScreen from '@/screens/inbox/InboxScreen';
import TaskDetailsScreen from '@/screens/inbox/TaskDetailsScreen';

export type InboxStackParamList = {
  InboxScreen: undefined;
  TaskDetailsScreen: { taskId: number };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

export const InboxStack = () => {
  return (
    <Stack.Navigator initialRouteName="InboxScreen">
      <Stack.Screen options={{ headerShown: false }} name="InboxScreen" component={InboxScreen} />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="TaskDetailsScreen"
        component={TaskDetailsScreen}
      />
    </Stack.Navigator>
  );
};
