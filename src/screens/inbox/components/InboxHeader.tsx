import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components-next/common/icon';
import { AddIcon, CaretBottomSmall, DoubleCheckIcon } from '@/svg-icons';
import { tailwind } from '@/theme';

type InboxHeaderProps = {
  selectedAgentName: string;
  onPressAgentFilter: () => void;
  onPressAddTask: () => void;
  onPressCompleteAll: () => void;
  title?: string;
  showCompleteAll?: boolean;
};

export const InboxHeader = (props: InboxHeaderProps) => {
  const {
    selectedAgentName,
    onPressAgentFilter,
    onPressAddTask,
    onPressCompleteAll,
    title = 'Tarefas',
    showCompleteAll = true,
  } = props;

  return (
    <Animated.View style={[tailwind.style('border-b-[1px] border-b-blackA-A3')]}>
      <Animated.View
        style={[tailwind.style('flex flex-row justify-between items-center px-4 pt-2 pb-[12px]')]}>
        <Animated.View style={tailwind.style('flex-1')}>
          <Pressable
            hitSlop={12}
            onPress={onPressAgentFilter}
            style={tailwind.style('self-start flex-row items-center gap-1')}>
            <Animated.Text
              numberOfLines={1}
              style={tailwind.style('max-w-[95px] text-sm text-gray-800')}>
              {selectedAgentName}
            </Animated.Text>
            <Icon icon={<CaretBottomSmall />} size={16} />
          </Pressable>
        </Animated.View>
        <Animated.View style={tailwind.style('flex-1')}>
          <Animated.Text
            style={tailwind.style(
              'text-[17px] text-center leading-[17px] tracking-[0.32px] font-inter-medium-24 text-gray-950',
            )}>
            {title}
          </Animated.Text>
        </Animated.View>
        <Animated.View style={tailwind.style('flex-1 flex-row justify-end items-center gap-4')}>
          {showCompleteAll ? (
            <Pressable onPress={onPressCompleteAll} hitSlop={12}>
              <Icon icon={<DoubleCheckIcon />} size={24} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onPressAddTask}
            hitSlop={12}
            style={tailwind.style('w-8 h-8 items-center justify-center rounded-full bg-blue-700')}>
            <Icon icon={<AddIcon stroke="white" />} size={19} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};
