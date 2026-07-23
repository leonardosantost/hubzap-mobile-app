import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';

export const PointOfSaleScreen = () => {
  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Text style={tailwind.style('px-5 pt-4 text-2xl font-inter-semibold-24 text-gray-950')}>
        PDV
      </Text>
      <Text style={tailwind.style('px-5 pt-2 text-base font-inter-normal-20 text-gray-700')}>
        Em breve
      </Text>
    </SafeAreaView>
  );
};
