import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StatusBar } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StackActions, useNavigation } from '@react-navigation/native';

import { TAB_BAR_HEIGHT } from '@/constants';
import {
  Avatar,
  BottomSheetBackdrop,
  BottomSheetHeader,
  BottomSheetWrapper,
  Icon,
} from '@/components-next';
import { TickIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { taskActions } from '@/store/task/taskActions';
import { selectTaskAgents, selectTasks, selectTasksLoading } from '@/store/task/taskSelectors';
import {
  selectSchedulingAgentIds,
  selectSchedulingEnabled,
} from '@/store/app-features/appFeaturesSelectors';
import { showToast } from '@/utils/toastUtils';
import { InboxHeader, TaskFormSheet, TaskItem, WeeklyPlanner } from './components';

const sameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
};

const InboxScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const taskFormSheetRef = useRef<BottomSheetModal>(null);
  const agentSheetRef = useRef<BottomSheetModal>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tasks = useAppSelector(selectTasks);
  const agents = useAppSelector(selectTaskAgents);
  const isLoading = useAppSelector(selectTasksLoading);
  const schedulingEnabled = useAppSelector(selectSchedulingEnabled);
  const schedulingAgentIds = useAppSelector(selectSchedulingAgentIds);
  const visibleAgents = useMemo(() => {
    if (!schedulingEnabled || schedulingAgentIds.length === 0) return agents;
    return agents.filter(agent => schedulingAgentIds.includes(agent.id));
  }, [agents, schedulingAgentIds, schedulingEnabled]);
  const selectedAgent = visibleAgents.find(agent => agent.id === selectedAgentId);

  const fetchTasks = useCallback(() => {
    return Promise.all(
      [-1, 0, 1].map(dayOffset =>
        dispatch(
          taskActions.fetchTasks({
            date: addDays(selectedDate, dayOffset),
            assigneeId: selectedAgentId,
            taskType: schedulingEnabled ? 'appointment' : 'task',
          }),
        ),
      ),
    );
  }, [dispatch, schedulingEnabled, selectedAgentId, selectedDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    dispatch(taskActions.fetchAgents());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedAgentId) return;
    if (visibleAgents.some(agent => agent.id === selectedAgentId)) return;
    setSelectedAgentId(undefined);
  }, [selectedAgentId, visibleAgents]);

  const tasksForSelectedDate = useMemo(
    () =>
      tasks
        .filter(task => sameDay(new Date(task.dueAt), selectedDate))
        .sort((first, second) => {
          if (first.status !== second.status) {
            return first.status === 'completed' ? 1 : -1;
          }
          return new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime();
        }),
    [selectedDate, tasks],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
    setIsRefreshing(false);
  };

  const handleToggleComplete = async (taskId: number, status: 'pending' | 'completed') => {
    if (status === 'completed') {
      await dispatch(taskActions.reopenTask(taskId)).unwrap();
      return;
    }
    await dispatch(taskActions.completeTask(taskId)).unwrap();
  };

  const handleCompleteAll = async () => {
    if (!tasksForSelectedDate.length) return;
    await Promise.all(
      tasksForSelectedDate.map(task => dispatch(taskActions.completeTask(task.id)).unwrap()),
    );
    showToast({ message: 'Tarefas concluídas' });
  };

  const openTaskDetails = (taskId: number) => {
    navigation.dispatch(StackActions.push('TaskDetailsScreen', { taskId }));
  };

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator style={tailwind.style('mt-12')} />;
    return (
      <Animated.View style={tailwind.style('items-center px-8 pt-14')}>
        <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-800')}>
          {schedulingEnabled ? 'Nenhum agendamento para este dia' : 'Nenhuma tarefa para este dia'}
        </Animated.Text>
        <Animated.Text style={tailwind.style('mt-2 text-center text-sm text-gray-700')}>
          {schedulingEnabled
            ? 'Use o botão + para criar um novo agendamento.'
            : 'Use o botão + para criar um novo acompanhamento.'}
        </Animated.Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <StatusBar translucent backgroundColor={tailwind.color('bg-white')} barStyle="dark-content" />
      <InboxHeader
        selectedAgentName={selectedAgent?.name || 'Todos'}
        onPressAgentFilter={() => agentSheetRef.current?.present()}
        onPressAddTask={() => taskFormSheetRef.current?.present()}
        onPressCompleteAll={handleCompleteAll}
        title={schedulingEnabled ? 'Agenda' : 'Tarefas'}
        showCompleteAll={!schedulingEnabled}
      />
      <FlashList
        data={tasksForSelectedDate}
        estimatedItemSize={106}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onComplete={() => handleToggleComplete(item.id, item.status)}
            onPress={() => openTaskDetails(item.id)}
          />
        )}
        ListHeaderComponent={
          <WeeklyPlanner
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onTaskPress={task => openTaskDetails(task.id)}
            tasks={tasks}
          />
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 18}px]`)}
      />

      <TaskFormSheet
        sheetRef={taskFormSheetRef}
        selectedDate={selectedDate}
        tasks={tasksForSelectedDate}
        onSaved={fetchTasks}
        isAppointmentMode={schedulingEnabled}
      />
      <BottomSheetModal
        ref={agentSheetRef}
        snapPoints={['52%']}
        enablePanDownToClose
        backdropComponent={BottomSheetBackdrop}
        handleIndicatorStyle={tailwind.style('bg-blackA-A6 w-8 h-1 rounded-[11px]')}>
        <BottomSheetWrapper>
          <BottomSheetHeader headerText="Filtrar por agente" />
          <BottomSheetScrollView contentContainerStyle={tailwind.style('pt-3 pb-8')}>
            <Pressable
              onPress={() => {
                setSelectedAgentId(undefined);
                agentSheetRef.current?.dismiss();
              }}
              style={tailwind.style('flex-row items-center px-4 py-3')}>
              <Animated.Text style={tailwind.style('flex-1 text-base text-gray-950')}>
                Todos
              </Animated.Text>
              {!selectedAgentId ? <Icon icon={<TickIcon />} size={20} /> : null}
            </Pressable>
            {visibleAgents.map(agent => (
              <Pressable
                key={agent.id}
                onPress={() => {
                  setSelectedAgentId(agent.id);
                  agentSheetRef.current?.dismiss();
                }}
                style={tailwind.style('flex-row items-center px-4 py-3')}>
                <Avatar
                  size="sm"
                  src={agent.thumbnail ? { uri: agent.thumbnail } : undefined}
                  name={agent.name || ''}
                />
                <Animated.Text style={tailwind.style('ml-3 flex-1 text-base text-gray-950')}>
                  {agent.name}
                </Animated.Text>
                {selectedAgentId === agent.id ? <Icon icon={<TickIcon />} size={20} /> : null}
              </Pressable>
            ))}
          </BottomSheetScrollView>
        </BottomSheetWrapper>
      </BottomSheetModal>
    </SafeAreaView>
  );
};

export default InboxScreen;
