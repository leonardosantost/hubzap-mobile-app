import React from 'react';
import { Dimensions, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components-next';
import { TickIcon } from '@/svg-icons';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { conversationActions } from '@/store/conversation/conversationActions';
import { updateConversation } from '@/store/conversation/conversationSlice';
import { selectAllLabels } from '@/store/label/labelSelectors';
import { tailwind } from '@/theme';
import { Conversation } from '@/types';

const SCREEN_WIDTH = Dimensions.get('screen').width;
const ACTION_WIDTH = (SCREEN_WIDTH - 32 - 12 * 3) / 4;

type ConversationLabelButtonsProps = {
  conversation: Conversation;
  selectedLabels: string[];
};

export const ConversationLabelButtons = ({
  conversation,
  selectedLabels,
}: ConversationLabelButtonsProps) => {
  const dispatch = useAppDispatch();
  const labels = useAppSelector(selectAllLabels);
  const visibleLabels = labels.filter(label => label.showOnSidebar);
  const labelsToRender = visibleLabels.length ? visibleLabels : labels;

  const handleLabelPress = (labelTitle: string) => {
    const updatedLabels = selectedLabels.includes(labelTitle)
      ? selectedLabels.filter(label => label !== labelTitle)
      : [...selectedLabels, labelTitle];

    dispatch(updateConversation({ ...conversation, labels: updatedLabels }));
    dispatch(
      conversationActions.addOrUpdateConversationLabels({
        conversationId: conversation.id,
        labels: updatedLabels,
      }),
    );
  };

  if (!labelsToRender.length) {
    return null;
  }

  return (
    <Animated.View style={tailwind.style('px-4 pt-5')}>
      <Animated.Text
        style={tailwind.style(
          'pb-3 text-sm font-inter-medium-24 leading-[16px] tracking-[0.32px] text-gray-700',
        )}>
        Etiquetas
      </Animated.Text>
      <Animated.View style={tailwind.style('flex-row flex-wrap gap-3')}>
        {labelsToRender.map(label => {
          const isActive = selectedLabels.includes(label.title);
          return (
            <Pressable
              key={label.id}
              onPress={() => handleLabelPress(label.title)}
              style={({ pressed }) =>
                tailwind.style(
                  'items-center justify-between rounded-xl border-2 pt-5 pb-3',
                  `w-[${ACTION_WIDTH}px]`,
                  isActive ? 'border-blue-800 bg-blue-100' : 'border-transparent bg-gray-100',
                  pressed ? 'bg-gray-200' : '',
                )
              }>
              <Animated.View
                style={tailwind.style('h-7 w-7 rounded-full', `bg-[${label.color}]`)}
              />
              <Animated.Text
                numberOfLines={2}
                style={tailwind.style(
                  'min-h-[34px] pt-3 text-center text-md font-inter-normal-20 leading-[17px] tracking-[0.32px] text-gray-950',
                )}>
                {label.title}
              </Animated.Text>
              {isActive ? (
                <Animated.View style={tailwind.style('absolute right-2 top-2')}>
                  <Icon icon={<TickIcon />} size={20} />
                </Animated.View>
              ) : null}
            </Pressable>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
};
