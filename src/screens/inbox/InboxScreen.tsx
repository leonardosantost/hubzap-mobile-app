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
import { showToast } from '@/utils/toastUtils';
import { InboxHeader, TaskFormSheet, TaskItem, WeeklyPlanner } from './components';

const sameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

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
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  const fetchTasks = useCallback(() => {
    return dispatch(taskActions.fetchTasks({ date: selectedDate, assigneeId: selectedAgentId }));
  }, [dispatch, selectedAgentId, selectedDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    dispatch(taskActions.fetchAgents());
  }, [dispatch]);

  const tasksForSelectedDate = useMemo(
    () => tasks.filter(task => sameDay(new Date(task.dueAt), selectedDate)),
    [selectedDate, tasks],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
    setIsRefreshing(false);
  };

  const handleComplete = async (taskId: number) => {
    await dispatch(taskActions.completeTask(taskId)).unwrap();
  };

  const handleCompleteAll = async () => {
    if (!tasksForSelectedDate.length) return;
    await Promise.all(
      tasksForSelectedDate.map(task => dispatch(taskActions.completeTask(task.id)).unwrap()),
    );
    showToast({ message: 'Tarefas concluídas' });
  };

  const openConversation = (conversationId?: number) => {
    if (!conversationId) return;
    navigation.dispatch(
      StackActions.push('ChatScreen', {
        conversationId,
        isConversationOpenedExternally: false,
      }),
    );
  };

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator style={tailwind.style('mt-12')} />;
    return (
      <Animated.View style={tailwind.style('items-center px-8 pt-14')}>
        <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-800')}>
          Nenhuma tarefa para este dia
        </Animated.Text>
        <Animated.Text style={tailwind.style('mt-2 text-center text-sm text-gray-700')}>
          Use o botão + para criar um novo acompanhamento.
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
      />
      <FlashList
        data={tasksForSelectedDate}
        estimatedItemSize={106}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onComplete={() => handleComplete(item.id)}
            onPress={() => openConversation(item.conversation?.id)}
          />
        )}
        ListHeaderComponent={
          <WeeklyPlanner selectedDate={selectedDate} onSelectDate={setSelectedDate} />
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
            {agents.map(agent => (
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
