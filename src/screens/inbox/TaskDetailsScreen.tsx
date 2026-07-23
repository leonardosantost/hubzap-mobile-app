import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';

import { Avatar, Icon } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import type { InboxStackParamList } from '@/navigation/stack';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectTasks } from '@/store/task/taskSelectors';
import { taskActions } from '@/store/task/taskActions';
import { ChevronLeft, TickIcon } from '@/svg-icons';
import { useHaptic } from '@/utils';
import { tailwind } from '@/theme';

type Route = RouteProp<InboxStackParamList, 'TaskDetailsScreen'>;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const Header = ({ title }: { title: string }) => {
  const navigation = useNavigation();

  return (
    <View style={tailwind.style('border-b border-blackA-A3 bg-white')}>
      <View style={tailwind.style('flex-row items-center px-4 pt-2 pb-3')}>
        <View style={tailwind.style('flex-1 items-start')}>
          <Pressable hitSlop={16} onPress={() => navigation.goBack()}>
            <Icon icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} size={24} />
          </Pressable>
        </View>
        <Text
          numberOfLines={1}
          style={tailwind.style(
            'flex-[2] text-center text-[17px] font-inter-semibold-24 text-gray-950',
          )}>
          {title}
        </Text>
        <View style={tailwind.style('flex-1')} />
      </View>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;

  return (
    <View style={tailwind.style('border-b border-blackA-A3 py-3')}>
      <Text style={tailwind.style('text-xs font-inter-medium-24 uppercase text-gray-600')}>
        {label}
      </Text>
      <Text style={tailwind.style('pt-1 text-base text-gray-950')}>{value}</Text>
    </View>
  );
};

const TaskDetailsScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const haptic = useHaptic('light');
  const tasks = useAppSelector(selectTasks);
  const task = tasks.find(item => item.id === route.params.taskId);

  if (!task) {
    return (
      <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
        <Header title="Detalhes" />
        <View style={tailwind.style('flex-1 items-center justify-center px-8')}>
          <Text style={tailwind.style('text-center text-base text-gray-700')}>
            Esta tarefa não está mais disponível.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = task.title || task.contact?.name || task.conversation?.contactName || 'Tarefa';
  const contactName = task.contact?.name || task.conversation?.contactName;
  const isCompleted = task.status === 'completed';

  const toggleComplete = async () => {
    haptic?.();
    if (isCompleted) {
      await dispatch(taskActions.reopenTask(task.id)).unwrap();
      return;
    }
    await dispatch(taskActions.completeTask(task.id)).unwrap();
  };

  const openConversation = () => {
    if (!task.conversation?.id) return;
    navigation.dispatch(
      StackActions.push('ChatScreen', {
        conversationId: task.conversation.id,
        isConversationOpenedExternally: false,
      }),
    );
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header title={task.taskType === 'appointment' ? 'Agendamento' : 'Tarefa'} />
      <ScrollView contentContainerStyle={tailwind.style(`px-4 pt-5 pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <View style={tailwind.style('rounded-[8px] border border-blackA-A3 bg-white px-4 py-4')}>
          <View style={tailwind.style('flex-row items-start')}>
            <Pressable
              hitSlop={12}
              onPress={toggleComplete}
              style={tailwind.style(
                'mr-3 mt-1 h-[24px] w-[24px] items-center justify-center rounded-full border-[1.5px]',
                isCompleted ? 'border-gray-500 bg-gray-200' : 'border-gray-500 bg-white',
              )}>
              {isCompleted ? (
                <Icon icon={<TickIcon stroke={tailwind.color('text-gray-700')} />} size={16} />
              ) : null}
            </Pressable>
            <View style={tailwind.style('flex-1')}>
              <Text style={tailwind.style('text-xl font-inter-semibold-24 text-gray-950')}>
                {title}
              </Text>
              <Text style={tailwind.style('pt-1 text-sm text-gray-700')}>
                {isCompleted ? 'Concluída' : 'Pendente'}
              </Text>
            </View>
          </View>
        </View>

        <View style={tailwind.style('mt-4')}>
          <DetailRow label="Data e hora" value={dateFormatter.format(new Date(task.dueAt))} />
          <DetailRow label="Descrição" value={task.description || task.note} />
          <DetailRow label="Serviço" value={task.catalogItem?.name} />
          <DetailRow
            label="Duração"
            value={task.durationMinutes ? `${task.durationMinutes} minutos` : null}
          />
          <DetailRow label="Contato" value={contactName} />
        </View>

        <View style={tailwind.style('mt-5 flex-row items-center border-b border-blackA-A3 pb-4')}>
          {task.assignee ? (
            <Avatar
              size="sm"
              src={task.assignee.thumbnail ? { uri: task.assignee.thumbnail } : undefined}
              name={task.assignee.name || ''}
            />
          ) : null}
          <View style={tailwind.style('ml-3 flex-1')}>
            <Text style={tailwind.style('text-xs font-inter-medium-24 uppercase text-gray-600')}>
              Responsável
            </Text>
            <Text style={tailwind.style('pt-1 text-base text-gray-950')}>
              {task.assignee?.name || 'Todos'}
            </Text>
          </View>
        </View>

        {task.conversation?.id ? (
          <Pressable
            onPress={openConversation}
            style={tailwind.style(
              'mt-6 h-11 items-center justify-center rounded-[8px] bg-blue-800',
            )}>
            <Text style={tailwind.style('text-base font-inter-semibold-24 text-white')}>
              Ir para conversa
            </Text>
          </Pressable>
        ) : null}

        <View style={tailwind.style('mt-6 border-t border-blackA-A3 pt-4')}>
          <Text style={tailwind.style('text-xs font-inter-medium-24 uppercase text-gray-600')}>
            Criada por
          </Text>
          <View style={tailwind.style('mt-2 flex-row items-center')}>
            {task.createdBy ? (
              <Avatar
                size="xs"
                src={task.createdBy.thumbnail ? { uri: task.createdBy.thumbnail } : undefined}
                name={task.createdBy.name || task.createdBy.availableName || ''}
              />
            ) : null}
            <Text style={tailwind.style('ml-2 text-sm text-gray-700')}>
              {task.createdBy?.name ||
                task.createdBy?.availableName ||
                task.createdBy?.email ||
                'Não informado'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TaskDetailsScreen;
