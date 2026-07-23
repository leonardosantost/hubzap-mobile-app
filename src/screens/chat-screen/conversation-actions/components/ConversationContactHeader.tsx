import React, { useState } from 'react';
import { Image, Modal, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar, Icon } from '@/components-next';
import { CloseIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { Contact } from '@/types';

type ConversationContactHeaderProps = {
  contact: Contact | null;
};

export const ConversationContactHeader = ({ contact }: ConversationContactHeaderProps) => {
  const [isPreviewVisible, setPreviewVisible] = useState(false);
  const name = contact?.name || '';
  const thumbnail = contact?.thumbnail || '';

  const handleAvatarPress = () => {
    if (thumbnail) {
      setPreviewVisible(true);
    }
  };

  return (
    <Animated.View style={tailwind.style('items-center px-4 pt-6')}>
      <Pressable onPress={handleAvatarPress} disabled={!thumbnail}>
        <Avatar size="4xl" src={thumbnail ? { uri: thumbnail } : undefined} name={name} />
      </Pressable>
      <Animated.Text
        numberOfLines={2}
        style={tailwind.style(
          'pt-3 text-center text-[22px] font-inter-medium-24 leading-[28px] text-gray-950',
        )}>
        {name}
      </Animated.Text>
      <Modal
        visible={isPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}>
        <Pressable
          onPress={() => setPreviewVisible(false)}
          style={tailwind.style('flex-1 items-center justify-center bg-blackA-A12 px-5')}>
          <Pressable
            hitSlop={12}
            onPress={() => setPreviewVisible(false)}
            style={tailwind.style(
              'absolute right-5 top-14 z-10 h-10 w-10 items-center justify-center rounded-full bg-white',
            )}>
            <Icon icon={<CloseIcon stroke="#303030" />} size={24} />
          </Pressable>
          <Image
            source={{ uri: thumbnail }}
            resizeMode="contain"
            style={tailwind.style('h-[70%] w-full rounded-[13px]')}
          />
        </Pressable>
      </Modal>
    </Animated.View>
  );
};
