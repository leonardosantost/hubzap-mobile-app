import React, { memo } from 'react';
import { ImageURISource } from 'react-native';
import { LinearTransition } from 'react-native-reanimated';
import { isEqual } from 'lodash';

import { Avatar, AvatarStatusType, Icon } from '@/components-next/common';
import { AnimatedNativeView } from '@/components-next/native-components';
import { tailwind } from '@/theme';
import { AvailabilityStatus, Channel, ConversationAdditionalAttributes } from '@/types';
import { Inbox } from '@/types/Inbox';
import { getChannelIcon } from '@/utils';

type ConversationAvatarProps = {
  src: ImageURISource;
  name: string;
  status: AvailabilityStatus;
  inbox?: Inbox | null;
  additionalAttributes?: ConversationAdditionalAttributes;
};

const checkIfPropsAreSame = (prev: ConversationAvatarProps, next: ConversationAvatarProps) => {
  const arePropsEqual = isEqual(prev, next);
  return arePropsEqual;
};

export const ConversationAvatar = memo((props: ConversationAvatarProps) => {
  const { src, name, status, inbox, additionalAttributes } = props;
  const { channelType = '', medium = '' } = inbox || {};
  const { type = '' } = additionalAttributes || {};

  return (
    <AnimatedNativeView
      style={tailwind.style('relative h-[50px] w-[50px] self-start overflow-visible')}
      layout={LinearTransition.springify().damping(28).stiffness(200)}>
      <Avatar size="4xl" {...{ src, name, status: status as AvatarStatusType }} />
      {inbox ? (
        <AnimatedNativeView
          style={[
            tailwind.style(
              'absolute -bottom-1 left-1/2 h-5 w-5 rounded-full bg-white items-center justify-center border-[1px] border-white',
            ),
            { transform: [{ translateX: -10 }] },
          ]}>
          <Icon icon={getChannelIcon(channelType as Channel, medium, type)} size={14} />
        </AnimatedNativeView>
      ) : null}
    </AnimatedNativeView>
  );
}, checkIfPropsAreSame);

ConversationAvatar.displayName = 'ConversationAvatar';
