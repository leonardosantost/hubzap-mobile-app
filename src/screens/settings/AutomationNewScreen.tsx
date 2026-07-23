import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';

import { Icon } from '@/components-next/common';
import { TAB_BAR_HEIGHT } from '@/constants';
import { AddIcon, ChevronLeft, MacrosIcon } from '@/svg-icons';
import { tailwind } from '@/theme';

import { automationTemplates } from './automationTemplates';

const Header = () => {
  const navigation = useNavigation();

  return (
    <Animated.View style={tailwind.style('border-b-[1px] border-b-blackA-A3 bg-white')}>
      <Animated.View style={tailwind.style('flex-row items-center px-4 pt-2 pb-3')}>
        <Animated.View style={tailwind.style('flex-1 items-start')}>
          <Pressable hitSlop={16} onPress={() => navigation.goBack()}>
            <Icon icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} size={24} />
          </Pressable>
        </Animated.View>
        <Animated.Text
          style={tailwind.style(
            'flex-[2] text-center text-[17px] font-inter-medium-24 text-gray-950',
          )}>
          Nova Automação
        </Animated.Text>
        <Animated.View style={tailwind.style('flex-1')} />
      </Animated.View>
    </Animated.View>
  );
};

const SectionTitle = ({ children }: { children: string }) => (
  <Animated.Text
    style={tailwind.style('px-4 pt-6 pb-3 text-sm font-inter-medium-24 uppercase text-gray-700')}>
    {children}
  </Animated.Text>
);

const StartFromScratch = () => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => navigation.dispatch(StackActions.push('AutomationEditorScreen'))}
      style={tailwind.style('mx-4 rounded-[8px] border border-blackA-A3 bg-white px-3 py-4')}>
      <Animated.View style={tailwind.style('flex-row items-center')}>
        <Animated.View
          style={tailwind.style('h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50')}>
          <Icon icon={<MacrosIcon stroke={tailwind.color('text-blue-800')} />} size={22} />
        </Animated.View>
        <Animated.View style={tailwind.style('ml-3 flex-1')}>
          <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
            Automação do zero
          </Animated.Text>
          <Animated.Text
            numberOfLines={2}
            style={tailwind.style('pt-0.5 text-sm font-inter-normal-20 text-gray-700')}>
            Crie um fluxo manualmente escolhendo gatilho, condição e ações.
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const TemplateRow = ({ template }: { template: (typeof automationTemplates)[number] }) => {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() =>
        navigation.dispatch(
          StackActions.push('AutomationEditorScreen', { templateKey: template.key }),
        )
      }
      style={tailwind.style('mx-4 mb-2 rounded-[8px] border border-blackA-A3 bg-white px-3 py-3')}>
      <Animated.View style={tailwind.style('flex-row items-center')}>
        <Animated.View
          style={[
            tailwind.style('h-9 w-9 items-center justify-center rounded-[8px]'),
            { backgroundColor: `${template.accent}18` },
          ]}>
          <Icon icon={<AddIcon stroke={template.accent} />} size={20} />
        </Animated.View>
        <Animated.View style={tailwind.style('ml-3 flex-1')}>
          <Animated.Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
            {template.name}
          </Animated.Text>
          <Animated.Text
            style={tailwind.style('pt-0.5 text-xs font-inter-normal-20 text-gray-700')}>
            {template.category}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
      <Animated.Text
        numberOfLines={2}
        style={tailwind.style('pt-3 text-sm font-inter-normal-20 text-gray-700')}>
        {template.description}
      </Animated.Text>
    </Pressable>
  );
};

const AutomationNewScreen = () => {
  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <Header />
      <ScrollView contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 24}px]`)}>
        <SectionTitle>Começar</SectionTitle>
        <StartFromScratch />

        <SectionTitle>Modelos prontos</SectionTitle>
        {automationTemplates.map(template => (
          <TemplateRow key={template.key} template={template} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AutomationNewScreen;
