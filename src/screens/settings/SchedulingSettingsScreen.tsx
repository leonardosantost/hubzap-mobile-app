import React, { useEffect } from 'react';
import { Pressable, ScrollView, Switch } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Avatar, Icon } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  selectSchedulingAgentIds,
  selectSchedulingBusinessDays,
  selectSchedulingEndHour,
  selectSchedulingEnabled,
  selectSchedulingShowOverdueOnNextDay,
  selectSchedulingStartHour,
} from '@/store/app-features/appFeaturesSelectors';
import {
  setSchedulingAgentIds,
  setSchedulingEnabled,
  setSchedulingHours,
  setSchedulingShowOverdueOnNextDay,
  toggleSchedulingAgent,
  toggleSchedulingBusinessDay,
} from '@/store/app-features/appFeaturesSlice';
import { taskActions } from '@/store/task/taskActions';
import { selectTaskAgents } from '@/store/task/taskSelectors';
import { ChevronLeft, TickIcon } from '@/svg-icons';
import { tailwind } from '@/theme';

const weekdays = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const hourOptions = Array.from({ length: 15 }, (_, index) => index + 6);

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
            'flex-[2] text-center text-[17px] font-inter-medium-24 text-gray-950',
          )}>
          Agendamentos
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1')} />
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

const HourOption = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'rounded-full border px-3 py-2',
      selected ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3 bg-white',
    )}>
    <Animated.Text style={tailwind.style('text-sm', selected ? 'text-blue-800' : 'text-gray-700')}>
      {label}
    </Animated.Text>
  </Pressable>
);

const SchedulingSettingsScreen = () => {
  const dispatch = useAppDispatch();
  const enabled = useAppSelector(selectSchedulingEnabled);
  const agentIds = useAppSelector(selectSchedulingAgentIds);
  const businessDays = useAppSelector(selectSchedulingBusinessDays);
  const startHour = useAppSelector(selectSchedulingStartHour);
  const endHour = useAppSelector(selectSchedulingEndHour);
  const showOverdueOnNextDay = useAppSelector(selectSchedulingShowOverdueOnNextDay);
  const agents = useAppSelector(selectTaskAgents);

  useEffect(() => {
    dispatch(taskActions.fetchAgents());
  }, [dispatch]);

  const toggleAgent = (agentId: number) => {
    if (agentIds.length === 0) {
      dispatch(
        setSchedulingAgentIds(agents.filter(agent => agent.id !== agentId).map(agent => agent.id)),
      );
      return;
    }
    dispatch(toggleSchedulingAgent(agentId));
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header />
      <ScrollView contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <SectionTitle>Status</SectionTitle>
        <Animated.View
          style={tailwind.style(
            'mx-4 flex-row items-center justify-between rounded-[8px] border border-blackA-A3 px-3 py-3',
          )}>
          <Animated.View style={tailwind.style('flex-1 pr-3')}>
            <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
              Ativar agendamentos
            </Animated.Text>
            <Animated.Text style={tailwind.style('pt-0.5 text-sm text-gray-700')}>
              Transforma tarefas em agenda e habilita criação de agendamento no chat.
            </Animated.Text>
          </Animated.View>
          <Switch
            value={enabled}
            onValueChange={value => {
              dispatch(setSchedulingEnabled(value));
            }}
          />
        </Animated.View>

        <Animated.View
          style={tailwind.style(
            'mx-4 mt-2 flex-row items-center justify-between rounded-[8px] border border-blackA-A3 px-3 py-3',
          )}>
          <Animated.View style={tailwind.style('flex-1 pr-3')}>
            <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
              Mostrar atrasadas no próximo dia
            </Animated.Text>
            <Animated.Text style={tailwind.style('pt-0.5 text-sm text-gray-700')}>
              Mantém pendências vencidas no início do dia atual com aviso de atraso.
            </Animated.Text>
          </Animated.View>
          <Switch
            value={showOverdueOnNextDay}
            onValueChange={value => {
              dispatch(setSchedulingShowOverdueOnNextDay(value));
            }}
          />
        </Animated.View>

        <SectionTitle>Membros que atendem</SectionTitle>
        {agents.map(agent => {
          const selected = agentIds.length === 0 || agentIds.includes(agent.id);

          return (
            <Pressable
              key={agent.id}
              onPress={() => toggleAgent(agent.id)}
              style={tailwind.style('mx-4 flex-row items-center border-b border-blackA-A3 py-3')}>
              <Avatar
                size="sm"
                src={agent.thumbnail ? { uri: agent.thumbnail } : undefined}
                name={agent.name || ''}
              />
              <Animated.View style={tailwind.style('ml-3 flex-1')}>
                <Animated.Text
                  style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  {agent.name}
                </Animated.Text>
                <Animated.Text style={tailwind.style('pt-0.5 text-sm text-gray-700')}>
                  {selected ? 'Atende agendamentos' : 'Não atende agendamentos'}
                </Animated.Text>
              </Animated.View>
              {selected ? <Icon icon={<TickIcon />} size={20} /> : null}
            </Pressable>
          );
        })}

        <SectionTitle>Dias úteis</SectionTitle>
        <Animated.View style={tailwind.style('flex-row flex-wrap gap-2 px-4')}>
          {weekdays.map(day => (
            <HourOption
              key={day.value}
              label={day.label}
              selected={businessDays.includes(day.value)}
              onPress={() => dispatch(toggleSchedulingBusinessDay(day.value))}
            />
          ))}
        </Animated.View>

        <SectionTitle>Horário de funcionamento</SectionTitle>
        <Animated.Text style={tailwind.style('px-4 pb-2 text-sm text-gray-700')}>
          Início
        </Animated.Text>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tailwind.style('gap-2 px-4')}>
          {hourOptions.slice(0, -1).map(hour => (
            <HourOption
              key={`start-${hour}`}
              label={`${String(hour).padStart(2, '0')}:00`}
              selected={startHour === hour}
              onPress={() =>
                dispatch(
                  setSchedulingHours({ startHour: hour, endHour: Math.max(hour + 1, endHour) }),
                )
              }
            />
          ))}
        </Animated.ScrollView>
        <Animated.Text style={tailwind.style('px-4 pt-5 pb-2 text-sm text-gray-700')}>
          Encerramento
        </Animated.Text>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tailwind.style('gap-2 px-4')}>
          {hourOptions.slice(1).map(hour => (
            <HourOption
              key={`end-${hour}`}
              label={`${String(hour).padStart(2, '0')}:00`}
              selected={endHour === hour}
              onPress={() =>
                dispatch(
                  setSchedulingHours({ startHour: Math.min(startHour, hour - 1), endHour: hour }),
                )
              }
            />
          ))}
        </Animated.ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SchedulingSettingsScreen;
