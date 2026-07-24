import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar, Icon } from '@/components-next';
import { TickIcon } from '@/svg-icons';
import type { ConversationTask } from '@/types/Task';
import { useHaptic } from '@/utils';
import { tailwind } from '@/theme';

type TaskItemProps = {
  task: ConversationTask;
  onComplete: () => void | Promise<void>;
  onPress: () => void;
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const overdueFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export const TaskItem = ({ task, onComplete, onPress }: TaskItemProps) => {
  const contactName = task.contact?.name || task.conversation?.contactName;
  const title = task.title || contactName || 'Follow-up';
  const description = task.description || task.note;
  const isCompleted = task.status === 'completed';
  const dueAt = new Date(task.dueAt);
  const isOverdue = !isCompleted && dueAt < new Date();
  const haptic = useHaptic('light');
  const [optimisticCompleted, setOptimisticCompleted] = useState(isCompleted);
  const checkboxScale = useSharedValue(isCompleted ? 1 : 0);
  const itemOpacity = useSharedValue(isCompleted ? 0.62 : 1);

  useEffect(() => {
    setOptimisticCompleted(isCompleted);
  }, [isCompleted]);

  useEffect(() => {
    checkboxScale.value = withSpring(optimisticCompleted ? 1 : 0, {
      damping: 10,
      stiffness: 220,
      mass: 0.7,
    });
    itemOpacity.value = withTiming(optimisticCompleted ? 0.62 : 1, { duration: 180 });
  }, [checkboxScale, itemOpacity, optimisticCompleted]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
    opacity: checkboxScale.value,
  }));

  const itemStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  const handleCheckPress = async () => {
    const nextValue = !optimisticCompleted;
    haptic?.();
    setOptimisticCompleted(nextValue);
    try {
      await onComplete();
    } catch {
      setOptimisticCompleted(!nextValue);
    }
  };

  return (
    <Pressable onPress={onPress} style={tailwind.style('px-4 py-3')}>
      <Animated.View
        style={[
          tailwind.style(
            'border-[1px] rounded-lg bg-white px-3 py-3',
            isOverdue && !optimisticCompleted ? 'border-red-500' : 'border-blackA-A3',
          ),
          itemStyle,
        ]}>
        <Animated.View style={tailwind.style('flex-row items-start')}>
          <Pressable
            hitSlop={12}
            onPress={handleCheckPress}
            style={tailwind.style(
              'mr-3 mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px]',
              optimisticCompleted ? 'border-gray-500 bg-gray-200' : 'border-gray-500 bg-white',
            )}>
            <Animated.View style={checkStyle}>
              <Icon icon={<TickIcon stroke={tailwind.color('text-gray-700')} />} size={15} />
            </Animated.View>
          </Pressable>
          <Animated.View style={tailwind.style('flex-1 pr-3')}>
            <Animated.Text
              numberOfLines={1}
              style={tailwind.style(
                'text-base font-inter-medium-24',
                optimisticCompleted ? 'text-gray-600' : 'text-gray-950',
              )}>
              {title}
            </Animated.Text>
            {description ? (
              <Animated.Text
                numberOfLines={2}
                style={tailwind.style(
                  'mt-1 text-sm font-inter-420-20',
                  optimisticCompleted ? 'text-gray-500' : 'text-gray-700',
                )}>
                {description}
              </Animated.Text>
            ) : null}
          </Animated.View>
        </Animated.View>
        <Animated.View style={tailwind.style('mt-3 flex-row items-center justify-between')}>
          <Animated.View style={tailwind.style('flex-row items-center flex-1')}>
            {task.assignee ? (
              <Avatar
                size="xs"
                src={task.assignee.thumbnail ? { uri: task.assignee.thumbnail } : undefined}
                name={task.assignee.name || ''}
              />
            ) : null}
            <Animated.Text numberOfLines={1} style={tailwind.style('ml-2 text-xs text-gray-700')}>
              {task.assignee?.name || 'Todos'}
              {contactName ? `  ·  ${contactName}` : ''}
            </Animated.Text>
          </Animated.View>
          <Animated.Text
            style={tailwind.style(
              'text-sm font-inter-medium-24',
              optimisticCompleted ? 'text-gray-500' : isOverdue ? 'text-red-700' : 'text-gray-700',
            )}>
            {isOverdue
              ? `Atrasada desde ${overdueFormatter.format(dueAt)}`
              : timeFormatter.format(dueAt)}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};
