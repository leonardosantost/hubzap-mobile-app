import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components-next';
import { ChatIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { formatConversationListTime } from '@/utils/dateTimeUtils';

type TeamChatPinnedItemProps = {
  onPress: () => void;
  teamName?: string | null;
  message?: string | null;
  senderName?: string | null;
  updatedAt?: number | null;
};

export const TeamChatPinnedItem = ({
  onPress,
  teamName,
  message,
  senderName,
  updatedAt,
}: TeamChatPinnedItemProps) => {
  const preview = message
    ? `${teamName || 'Equipe'} - ${senderName || 'Agente'}: ${message}`
    : 'Nenhuma mensagem ainda';

  return (
    <Pressable onPress={onPress} style={tailwind.style('px-3 bg-[#FFFBEB]')}>
      <Animated.View style={tailwind.style('flex-row justify-between gap-3')}>
        <Animated.View style={tailwind.style('py-3 flex-row')}>
          <Animated.View
            style={tailwind.style(
              'relative h-[50px] w-[50px] items-center justify-center rounded-full bg-[#FEF3C7]',
            )}>
            <Icon icon={<ChatIcon stroke="#8A6A00" />} size={24} />
          </Animated.View>
        </Animated.View>
        <Animated.View
          style={tailwind.style('flex-1 gap-1 py-3 border-b-[1px] border-b-blackA-A3')}>
          <Animated.View style={tailwind.style('flex-row items-center justify-between h-[24px]')}>
            <Text
              numberOfLines={1}
              style={tailwind.style(
                'flex-1 text-base font-inter-medium-24 tracking-[0.24px] text-gray-950',
              )}>
              Chat da Equipe
            </Text>
            {updatedAt ? (
              <Text style={tailwind.style('ml-2 text-sm text-gray-700')}>
                {formatConversationListTime(updatedAt)}
              </Text>
            ) : null}
          </Animated.View>
          <Text numberOfLines={2} style={tailwind.style('text-sm leading-[20px] text-gray-700')}>
            {preview}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};
