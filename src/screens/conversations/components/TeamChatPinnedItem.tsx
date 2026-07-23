import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components-next';
import { ChatIcon, CaretRight } from '@/svg-icons';
import { tailwind } from '@/theme';

export const TeamChatPinnedItem = ({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress} style={tailwind.style('mx-3 mt-3 mb-1')}>
    <Animated.View
      style={tailwind.style(
        'flex-row items-center rounded-lg border-[1px] border-[#E8CE84] bg-[#FFF8DC] px-3 py-3',
      )}>
      <Animated.View
        style={tailwind.style('h-9 w-9 items-center justify-center rounded-full bg-[#F6D86B]')}>
        <Icon icon={<ChatIcon stroke="#6B5410" />} size={20} />
      </Animated.View>
      <Animated.View style={tailwind.style('ml-3 flex-1')}>
        <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
          Chat da Equipe
        </Animated.Text>
        <Animated.Text numberOfLines={1} style={tailwind.style('mt-0.5 text-sm text-gray-700')}>
          Equipe - Agente: Mensagem
        </Animated.Text>
      </Animated.View>
      <Icon icon={<CaretRight stroke={tailwind.color('text-gray-700')} />} size={20} />
    </Animated.View>
  </Pressable>
);
