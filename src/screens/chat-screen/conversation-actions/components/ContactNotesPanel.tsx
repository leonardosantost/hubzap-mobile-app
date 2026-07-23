import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { tailwind } from '@/theme';

type ContactNotesPanelProps = {
  note?: string;
};

export const ContactNotesPanel = ({ note }: ContactNotesPanelProps) => {
  return (
    <Animated.View>
      <Animated.View style={tailwind.style('pl-4 pb-3')}>
        <Animated.Text
          style={tailwind.style(
            'text-sm font-inter-medium-24 leading-[16px] tracking-[0.32px] text-gray-700',
          )}>
          Notas do contato
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[tailwind.style('mx-4 rounded-[13px] bg-white px-3 py-3'), styles.shadow]}>
        <Animated.Text
          style={tailwind.style(
            'text-base font-inter-normal-20 leading-[22px] tracking-[0.16px] text-gray-950',
            !note ? 'text-gray-700' : '',
          )}>
          {note || 'Sem notas cadastradas'}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadow:
    Platform.select({
      ios: {
        shadowColor: '#00000040',
        shadowOffset: { width: 0, height: 0.15 },
        shadowRadius: 2,
        shadowOpacity: 0.35,
        elevation: 2,
      },
      android: {
        elevation: 4,
        backgroundColor: 'white',
      },
    }) || {},
});
