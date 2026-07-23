import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '@/screens/settings/SettingsScreen';
import ApplicationsScreen from '@/screens/settings/ApplicationsScreen';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  ApplicationsScreen: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack = () => {
  return (
    <Stack.Navigator initialRouteName="SettingsScreen">
      <Stack.Screen
        options={{ headerShown: false }}
        name="SettingsScreen"
        component={SettingsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="ApplicationsScreen"
        component={ApplicationsScreen}
      />
    </Stack.Navigator>
  );
};
