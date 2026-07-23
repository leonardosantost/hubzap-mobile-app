import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Avatar, Icon } from '@/components-next';
import { TickIcon } from '@/svg-icons';
import type { ConversationTask } from '@/types/Task';
import { tailwind } from '@/theme';

type TaskItemProps = {
  task: ConversationTask;
  onComplete: () => void;
  onPress: () => void;
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const TaskItem = ({ task, onComplete, onPress }: TaskItemProps) => {
  const contactName = task.contact?.name || task.conversation?.contactName;
  const title = task.title || contactName || 'Follow-up';
  const description = task.description || task.note;

  return (
    <Pressable onPress={onPress} style={tailwind.style('px-4 py-3')}>
      <Animated.View
        style={tailwind.style('border-[1px] border-blackA-A3 rounded-lg bg-white px-3 py-3')}>
        <Animated.View style={tailwind.style('flex-row items-start')}>
          <Animated.View style={tailwind.style('flex-1 pr-3')}>
            <Animated.Text
              numberOfLines={1}
              style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
              {title}
            </Animated.Text>
            {description ? (
              <Animated.Text
                numberOfLines={2}
                style={tailwind.style('mt-1 text-sm font-inter-420-20 text-gray-700')}>
                {description}
              </Animated.Text>
            ) : null}
          </Animated.View>
          <Pressable hitSlop={12} onPress={onComplete} style={tailwind.style('p-1')}>
            <Icon icon={<TickIcon stroke={tailwind.color('text-blue-700')} />} size={22} />
          </Pressable>
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
          <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-blue-700')}>
            {timeFormatter.format(new Date(task.dueAt))}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};
