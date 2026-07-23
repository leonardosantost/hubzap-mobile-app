import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { Icon } from '@/components-next/common';
import {
  AddIcon,
  CheckedIcon,
  ChevronLeft,
  CloseIcon,
  FilterIcon,
  UncheckedIcon,
} from '@/svg-icons';
import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useScaleAnimation } from '@/utils';
import { useHeaderAnimation } from '@/hooks/useHeaderAnimation';

type HeaderState = 'Search' | 'Filter' | 'Select' | 'none';
export type ConversationViewMode = 'list' | 'board';

type ConversationHeaderPresenterProps = {
  currentState: HeaderState;
  viewMode?: ConversationViewMode;
  isSelectedAll: boolean;
  filtersAppliedCount: number;
  onViewModeChange?: (mode: ConversationViewMode) => void;
  onLeftIconPress: () => void;
  onRightIconPress: () => void;
  onClearFilter: () => void;
  title?: string;
  onBack?: () => void;
  showViewModeTabs?: boolean;
};

type LeftSectionProps = {
  currentState: HeaderState;
  isSelectedAll: boolean;
  onLeftIconPress: () => void;
  onBack?: () => void;
};

type FilterSectionProps = {
  filtersAppliedCount: number;
  onClearFilter: () => void;
  handlers: Record<string, unknown>;
  animatedStyle: ViewStyle | AnimatedStyle<ViewStyle>;
};

type RightSectionProps = {
  currentState: HeaderState;
  filtersAppliedCount: number;
  onRightIconPress: () => void;
};

const HeaderTitle = ({ title }: { title?: string }) => (
  <Animated.View style={tailwind.style('flex-1')}>
    <Text
      style={tailwind.style(
        'text-[17px] font-inter-medium-24 tracking-[0.32px] leading-[17px] text-center text-gray-950',
      )}>
      {title || i18n.t('CONVERSATION.HEADER.TITLE')}
    </Text>
  </Animated.View>
);

const ViewModeTabs = ({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ConversationViewMode;
  onViewModeChange: (mode: ConversationViewMode) => void;
}) => (
  <Animated.View style={tailwind.style('px-4 pb-2')}>
    <Animated.View style={tailwind.style('h-9 flex-row rounded-[11px] bg-blackA-A3 p-1')}>
      {[
        ['list', 'Lista'],
        ['board', 'Quadro'],
      ].map(([mode, label]) => {
        const isActive = viewMode === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onViewModeChange(mode as ConversationViewMode)}
            style={tailwind.style(
              'flex-1 items-center justify-center rounded-[8px]',
              isActive ? 'bg-white' : '',
            )}>
            <Text
              style={tailwind.style(
                'text-sm font-inter-medium-24 leading-[17px]',
                isActive ? 'text-gray-950' : 'text-gray-800',
              )}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  </Animated.View>
);

const LeftSection = ({
  currentState,
  isSelectedAll,
  onLeftIconPress,
  onBack,
}: LeftSectionProps) => {
  const { entering, exiting } = useHeaderAnimation();

  if (currentState === 'Filter' || currentState === 'Search') return null;
  if (currentState !== 'Select') {
    if (onBack) {
      return (
        <Animated.View style={tailwind.style('flex-1 items-start')}>
          <Pressable onPress={onBack} hitSlop={16}>
            <Icon size={24} icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} />
          </Pressable>
        </Animated.View>
      );
    }
    return <Animated.View style={tailwind.style('flex-1')} />;
  }

  return (
    <Animated.View style={tailwind.style('flex-1 items-start')}>
      <Pressable onPress={onLeftIconPress} hitSlop={16}>
        <Animated.View exiting={exiting} entering={entering}>
          <Icon
            size={24}
            icon={
              isSelectedAll ? (
                <CheckedIcon />
              ) : (
                <UncheckedIcon stroke={tailwind.color('text-gray-800')} />
              )
            }
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const FilterSection = ({
  filtersAppliedCount,
  onClearFilter,
  handlers,
  animatedStyle,
}: FilterSectionProps) => {
  const { entering, exiting } = useHeaderAnimation();

  return (
    <Animated.View
      style={[tailwind.style('flex-1'), animatedStyle]}
      exiting={exiting}
      entering={entering}>
      <Pressable onPress={onClearFilter} disabled={filtersAppliedCount === 0} {...handlers}>
        <Text
          style={tailwind.style(
            'text-md font-inter-medium-24 leading-[17px] tracking-[0.24px]',
            filtersAppliedCount === 0 ? 'text-gray-700' : 'text-blue-800',
          )}>
          {i18n.t('CONVERSATION.HEADER.CLEAR_FILTER')}
          {filtersAppliedCount > 0 ? ` (${filtersAppliedCount})` : ''}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const RightSection = ({
  currentState,
  filtersAppliedCount,
  onRightIconPress,
}: RightSectionProps) => {
  const { entering, exiting } = useHeaderAnimation();

  return (
    <Animated.View style={tailwind.style('flex-1 flex-row items-center justify-end gap-3')}>
      <Pressable onPress={onRightIconPress} hitSlop={16}>
        {currentState === 'Filter' || currentState === 'Select' ? (
          <Animated.View exiting={exiting} entering={entering}>
            <Icon size={24} icon={<CloseIcon />} />
          </Animated.View>
        ) : (
          <Animated.View exiting={exiting} entering={entering}>
            {filtersAppliedCount > 0 && (
              <Animated.View
                style={tailwind.style(
                  'absolute z-10 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-800',
                )}
              />
            )}
            <Icon size={24} icon={<FilterIcon />} />
          </Animated.View>
        )}
      </Pressable>
      {currentState === 'none' ? (
        <Pressable onPress={() => {}} hitSlop={8}>
          <Animated.View
            exiting={exiting}
            entering={entering}
            style={tailwind.style('h-9 w-9 items-center justify-center rounded-full bg-blue-800')}>
            <Icon size={20} icon={<AddIcon stroke={tailwind.color('text-white')} />} />
          </Animated.View>
        </Pressable>
      ) : null}
    </Animated.View>
  );
};

export const ConversationHeaderPresenter = ({
  currentState,
  viewMode,
  isSelectedAll,
  filtersAppliedCount,
  onViewModeChange,
  onLeftIconPress,
  onRightIconPress,
  onClearFilter,
  title,
  onBack,
  showViewModeTabs = true,
}: ConversationHeaderPresenterProps) => {
  const { handlers, animatedStyle } = useScaleAnimation();

  return (
    <React.Fragment>
      <Animated.View
        style={[tailwind.style('flex flex-row justify-between items-center px-4 pt-2 pb-[12px]')]}>
        <LeftSection
          currentState={currentState}
          isSelectedAll={isSelectedAll}
          onLeftIconPress={onLeftIconPress}
          onBack={onBack}
        />
        {currentState === 'Filter' && (
          <FilterSection
            filtersAppliedCount={filtersAppliedCount}
            onClearFilter={onClearFilter}
            handlers={handlers}
            animatedStyle={animatedStyle}
          />
        )}
        <HeaderTitle title={title} />
        <RightSection
          currentState={currentState}
          filtersAppliedCount={filtersAppliedCount}
          onRightIconPress={onRightIconPress}
        />
      </Animated.View>
      {showViewModeTabs && currentState === 'none' ? (
        <ViewModeTabs
          viewMode={viewMode || 'list'}
          onViewModeChange={onViewModeChange || (() => {})}
        />
      ) : null}
    </React.Fragment>
  );
};
