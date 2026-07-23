import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '@/screens/settings/SettingsScreen';
import ApplicationsScreen from '@/screens/settings/ApplicationsScreen';
import IntegrationsScreen from '@/screens/settings/IntegrationsScreen';
import EvolutionConnectionsScreen from '@/screens/settings/EvolutionConnectionsScreen';
import EvolutionConnectionScreen from '@/screens/settings/EvolutionConnectionScreen';
import AutomationsScreen from '@/screens/settings/AutomationsScreen';
import AutomationNewScreen from '@/screens/settings/AutomationNewScreen';
import AutomationEditorScreen from '@/screens/settings/AutomationEditorScreen';
import CatalogItemsScreen from '@/screens/settings/CatalogItemsScreen';
import SchedulingSettingsScreen from '@/screens/settings/SchedulingSettingsScreen';
import {
  CannedResponsesSettingsScreen,
  CustomAttributesSettingsScreen,
  ProfileSettingsScreen,
  UsersAndTeamsSettingsScreen,
} from '@/screens/settings/AdminSettingsScreens';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  ApplicationsScreen: undefined;
  IntegrationsScreen: undefined;
  EvolutionConnectionsScreen: undefined;
  EvolutionConnectionScreen: { inboxId?: number; mode?: 'create' } | undefined;
  AutomationsScreen: undefined;
  AutomationNewScreen: undefined;
  AutomationEditorScreen: { templateKey?: string; automationId?: number } | undefined;
  CatalogItemsScreen: undefined;
  SchedulingSettingsScreen: undefined;
  ProfileSettingsScreen: undefined;
  UsersAndTeamsSettingsScreen: undefined;
  CannedResponsesSettingsScreen: undefined;
  CustomAttributesSettingsScreen: undefined;
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
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="IntegrationsScreen"
        component={IntegrationsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="EvolutionConnectionsScreen"
        component={EvolutionConnectionsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="EvolutionConnectionScreen"
        component={EvolutionConnectionScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="AutomationsScreen"
        component={AutomationsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="AutomationNewScreen"
        component={AutomationNewScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="AutomationEditorScreen"
        component={AutomationEditorScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="CatalogItemsScreen"
        component={CatalogItemsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="SchedulingSettingsScreen"
        component={SchedulingSettingsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="ProfileSettingsScreen"
        component={ProfileSettingsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="UsersAndTeamsSettingsScreen"
        component={UsersAndTeamsSettingsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="CannedResponsesSettingsScreen"
        component={CannedResponsesSettingsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false, animation: 'slide_from_right' }}
        name="CustomAttributesSettingsScreen"
        component={CustomAttributesSettingsScreen}
      />
    </Stack.Navigator>
  );
};
