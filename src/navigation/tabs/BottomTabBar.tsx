import React, { PropsWithChildren } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { BlurView, BlurViewProps } from '@react-native-community/blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { selectCurrentState } from '@/store/conversation/conversationHeaderSlice';
import { selectAllConversations } from '@/store/conversation/conversationSelectors';
import { selectNotificationsMetadata } from '@/store/notification/notificationSelectors';
import { selectSchedulingEnabled } from '@/store/app-features/appFeaturesSelectors';

import {
  ConversationIconFilled,
  ConversationIconOutline,
  PosIconFilled,
  PosIconOutline,
  SettingsIconFilled,
  SettingsIconOutline,
  TasksIconFilled,
  TasksIconOutline,
} from '@/svg-icons';
import { tailwind } from '@/theme';
import { useHaptic, useScaleAnimation, useTabBarHeight } from '@/utils';

import { TabParamList } from './AppTabs';
import { useAppSelector } from '@/hooks';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const tabExitSpringConfig = { damping: 20, stiffness: 360, mass: 1 };
const tabEnterSpringConfig = { damping: 30, stiffness: 360, mass: 1 };

type TabBarIconsProps = {
  focused: boolean;
  route: RouteProp<TabParamList, keyof TabParamList>;
};

const TabBarIcons = ({ focused, route }: TabBarIconsProps) => {
  switch (route.name) {
    case 'Conversations':
      return focused ? <ConversationIconFilled /> : <ConversationIconOutline />;
    case 'Inbox':
      return focused ? <TasksIconFilled /> : <TasksIconOutline />;
    case 'PointOfSale':
      return focused ? <PosIconFilled /> : <PosIconOutline />;
    case 'Settings':
      return focused ? <SettingsIconFilled /> : <SettingsIconOutline />;
  }
};

const formatBadgeCount = (count: number) => {
  if (count > 99) {
    return '99+';
  }

  return String(count);
};

const TabBadge = ({ count }: { count: number }) => {
  if (count <= 0) {
    return null;
  }

  return (
    <Animated.View
      style={tailwind.style(
        'absolute -right-2 top-0 z-10 min-w-[17px] items-center justify-center rounded-full bg-blue-800 px-1',
        count > 9 ? 'h-[17px]' : 'h-[17px] w-[17px]',
      )}>
      <Animated.Text
        numberOfLines={1}
        style={tailwind.style(
          'text-[10px] font-inter-medium-24 leading-[12px] tracking-[0px] text-white',
        )}>
        {formatBadgeCount(count)}
      </Animated.Text>
    </Animated.View>
  );
};

const getTabLabel = (routeName: keyof TabParamList, schedulingEnabled: boolean) => {
  switch (routeName) {
    case 'Inbox':
      return schedulingEnabled ? 'Agenda' : 'Tarefas';
    case 'Conversations':
      return 'Conversas';
    case 'PointOfSale':
      return 'PDV';
    case 'Settings':
      return 'Ajustes';
    default:
      return '';
  }
};

type TabBarBackgroundProps = BlurViewProps & PropsWithChildren;

const TabBarBackground = (props: TabBarBackgroundProps) => {
  const { children, style, blurAmount, blurType } = props;

  const currentState = useAppSelector(selectCurrentState);

  const tabBarHeight = useTabBarHeight();

  const derivedAnimatedState = useDerivedValue(() =>
    currentState === 'Select'
      ? withSpring(1, tabExitSpringConfig)
      : withSpring(0, tabEnterSpringConfig),
  );

  const animatedTabBarStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(derivedAnimatedState.value, [0, 1], [0, tabBarHeight]),
        },
      ],
    };
  });

  return Platform.OS === 'ios' ? (
    <AnimatedBlurView {...{ blurAmount, blurType }} style={[style, animatedTabBarStyle]}>
      {children}
    </AnimatedBlurView>
  ) : (
    <Animated.View style={[style, animatedTabBarStyle]}>{children}</Animated.View>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabItem = (props: any) => {
  const { handlers, animatedStyle } = useScaleAnimation();

  const { onPress, onLongPress, isFocused, options, route, badgeCount } = props;
  const schedulingEnabled = useAppSelector(selectSchedulingEnabled);

  // Memoize hitSlop to prevent new object reference on every render
  const hitSlop = React.useMemo(() => ({ top: 2, left: 10, right: 10, bottom: 10 }), []);

  // Use stable object reference for accessibilityState when not focused
  const accessibilityState = React.useMemo(
    () => (isFocused ? { selected: true } : {}),
    [isFocused],
  );
  return (
    <Animated.View
      style={[tailwind.style('justify-center items-center flex-1 bg-transparent'), animatedStyle]}>
      <Pressable
        hitSlop={hitSlop}
        {...handlers}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}>
        <Animated.View style={tailwind.style('items-center justify-center')}>
          <Animated.View style={tailwind.style('h-[34px] items-center justify-center')}>
            <TabBadge count={badgeCount || 0} />
            <Animated.View style={{ transform: [{ scale: 0.78 }] }}>
              <TabBarIcons focused={isFocused} route={route} />
            </Animated.View>
          </Animated.View>
          <Animated.Text
            numberOfLines={1}
            style={tailwind.style(
              'mt-[-2px] text-cxs font-inter-medium-24 leading-[14px]',
              isFocused ? 'text-gray-950' : 'text-gray-700',
            )}>
            {getTabLabel(route.name, schedulingEnabled)}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export const BottomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const hapticSelection = useHaptic();
  const tabBarHeight = useTabBarHeight();
  const conversations = useAppSelector(selectAllConversations);
  const { unreadCount: unreadNotificationCount } = useAppSelector(selectNotificationsMetadata);

  const unreadConversationCount = React.useMemo(
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0),
    [conversations],
  );

  const getBadgeCount = React.useCallback(
    (routeName: string) => {
      if (routeName === 'Inbox') {
        return unreadNotificationCount;
      }

      if (routeName === 'Conversations') {
        return unreadConversationCount;
      }

      return 0;
    },
    [unreadConversationCount, unreadNotificationCount],
  );

  // Memoize press handlers using useCallback
  const createPressHandler = React.useCallback(
    (route: { key: string; name: string; params?: object }, isFocused: boolean) => {
      return () => {
        hapticSelection?.();
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };
    },
    [hapticSelection, navigation],
  );

  // Memoize long press handler
  const createLongPressHandler = React.useCallback(
    (route: { key: string; name: string; params?: object }) => {
      return () => {
        navigation.emit({
          type: 'tabLongPress',
          target: route.key,
        });
      };
    },
    [navigation],
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={tailwind.style(
        'absolute bottom-0 w-full px-4 pt-1',
        Platform.OS === 'ios' ? 'pb-5' : 'pb-3',
        `h-[${tabBarHeight}px]`,
      )}>
      <TabBarBackground
        blurAmount={28}
        blurType="light"
        style={[
          tailwind.style(
            'flex-1 flex-row overflow-hidden rounded-[30px] border-[1px] border-blackA-A3 px-2',
            Platform.OS === 'ios' ? 'bg-[#FFFFFFD9]' : 'bg-white',
          ),
          {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.13,
            shadowRadius: 18,
            elevation: 10,
          },
        ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          return (
            <TabItem
              key={route.key}
              options={options}
              onPress={createPressHandler(route, isFocused)}
              onLongPress={createLongPressHandler(route)}
              route={route}
              isFocused={isFocused}
              badgeCount={getBadgeCount(route.name)}
            />
          );
        })}
      </TabBarBackground>
    </Animated.View>
  );
};
