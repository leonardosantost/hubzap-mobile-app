import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Switch } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';

import { Icon } from '@/components-next/common';
import { TAB_BAR_HEIGHT } from '@/constants';
import { AutomationRule, AutomationService } from '@/store/automation/automationService';
import { ChevronLeft, MacrosIcon } from '@/svg-icons';
import { tailwind } from '@/theme';

const Header = () => {
  const navigation = useNavigation();

  return (
    <Animated.View style={tailwind.style('border-b-[1px] border-b-blackA-A3 bg-white')}>
      <Animated.View style={tailwind.style('flex-row items-center px-4 pt-2 pb-3')}>
        <Animated.View style={tailwind.style('flex-1 items-start')}>
          <Pressable hitSlop={16} onPress={() => navigation.goBack()}>
            <Icon icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} size={24} />
          </Pressable>
        </Animated.View>
        <Animated.Text
          style={tailwind.style(
            'flex-1 text-center text-[17px] font-inter-medium-24 text-gray-950',
          )}>
          Automações
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1 items-end')}>
          <Pressable
            onPress={() => navigation.dispatch(StackActions.push('AutomationNewScreen'))}
            style={tailwind.style('rounded-[8px] bg-blue-800 px-3 py-2')}>
            <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-white')}>
              Nova Automação
            </Animated.Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const SectionTitle = ({ children }: { children: string }) => (
  <Animated.Text
    style={tailwind.style('px-4 pt-6 pb-3 text-sm font-inter-medium-24 uppercase text-gray-700')}>
    {children}
  </Animated.Text>
);

const RuleRow = ({
  rule,
  onPress,
  onToggle,
}: {
  rule: AutomationRule;
  onPress: () => void;
  onToggle: (active: boolean) => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style('mx-4 flex-row items-center border-b-[1px] border-b-blackA-A3 py-4')}>
    <Animated.View
      style={[
        tailwind.style('h-[42px] w-[42px] items-center justify-center rounded-[8px]'),
        { backgroundColor: rule.active ? '#E8F8EC' : '#F3F4F6' },
      ]}>
      <Icon icon={<MacrosIcon stroke={rule.active ? '#16A34A' : '#6B7280'} />} size={22} />
    </Animated.View>
    <Animated.View style={tailwind.style('ml-3 flex-1')}>
      <Animated.Text
        numberOfLines={1}
        style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
        {rule.name}
      </Animated.Text>
      <Animated.Text
        numberOfLines={1}
        style={tailwind.style('pt-0.5 text-sm font-inter-normal-20 text-gray-700')}>
        {rule.description || rule.event_name}
      </Animated.Text>
    </Animated.View>
    <Switch value={rule.active} onValueChange={onToggle} />
  </Pressable>
);

const AutomationsScreen = () => {
  const navigation = useNavigation();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await AutomationService.list();
    setRules(data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleRule = async (rule: AutomationRule, active: boolean) => {
    setRules(current => current.map(item => (item.id === rule.id ? { ...item, active } : item)));
    try {
      await AutomationService.update(rule.id, { active });
    } catch {
      setRules(current =>
        current.map(item => (item.id === rule.id ? { ...item, active: !active } : item)),
      );
    }
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header />
      {loading ? (
        <Animated.View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator />
        </Animated.View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
          <SectionTitle>Automações criadas</SectionTitle>
          {rules.length === 0 ? (
            <Animated.Text
              style={tailwind.style(
                'px-4 py-4 text-center text-sm font-inter-normal-20 text-gray-700',
              )}>
              Nenhuma automação criada. Toque em Nova Automação para começar.
            </Animated.Text>
          ) : null}
          {rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onPress={() =>
                navigation.dispatch(
                  StackActions.push('AutomationEditorScreen', { automationId: rule.id }),
                )
              }
              onToggle={active => toggleRule(rule, active)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default AutomationsScreen;
