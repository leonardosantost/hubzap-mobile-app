import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
} from 'react-native';
import Animated, {
  LinearTransition,
  runOnJS,
  SharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  useBottomSheetSpringConfigs,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { StackActions, useNavigation } from '@react-navigation/native';

import {
  ConversationItemContainer,
  ConversationHeader,
  StatusFilters,
  SortByFilters,
  InboxFilters,
  AssigneeTypeFilters,
} from './components';

import { ActionTabs, BottomSheetBackdrop, BottomSheetWrapper, SearchBar } from '@/components-next';

import { EmptyStateIcon } from '@/svg-icons';
import {
  SCREENS,
  TAB_BAR_HEIGHT,
  LAST_ACTIVE_TIMESTAMP_KEY,
  LAST_ACTIVE_TIMESTAMP_THRESHOLD,
} from '@/constants';
import {
  ConversationListStateProvider,
  useConversationListStateContext,
  useRefsContext,
} from '@/context';

import { tailwind } from '@/theme';
import { Conversation } from '@/types';
import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  selectBottomSheetState,
  setBottomSheetState,
} from '@/store/conversation/conversationHeaderSlice';
import { resetActionState } from '@/store/conversation/conversationActionSlice';
import { setFilters } from '@/store/conversation/conversationFilterSlice';
import { conversationActions } from '@/store/conversation/conversationActions';
import {
  selectConversationsLoading,
  selectIsAllConversationsFetched,
  getFilteredConversations,
} from '@/store/conversation/conversationSelectors';
import { selectFilters, FilterState } from '@/store/conversation/conversationFilterSlice';
import { ConversationPayload } from '@/store/conversation/conversationTypes';
import { clearAllConversations } from '@/store/conversation/conversationSlice';
import { selectUserId } from '@/store/auth/authSelectors';
import { clearAllContacts } from '@/store/contact/contactSlice';
import { clearAssignableAgents } from '@/store/assignable-agent/assignableAgentSlice';
import { selectAllLabels } from '@/store/label/labelSelectors';

import i18n from '@/i18n';
import ActionBottomSheet from '@/navigation/tabs/ActionBottomSheet';
import { getCurrentRouteName } from '@/utils/navigationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Label } from '@/types';
import { SalesFunnelBoard } from '@/screens/sales-funnel/SalesFunnelScreen';
import type { ConversationViewMode } from './components/conversation-header/ConversationHeaderPresenter';

// The screen list thats need to be checked for refreshing the conversations list
const REFRESH_SCREEN_LIST = [SCREENS.CONVERSATION, SCREENS.INBOX, SCREENS.SETTINGS];

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

type FlashListRenderItemType = {
  item: Conversation;
  index: number;
};

const shouldRefetchForFilterChange = (previousFilters: FilterState, updatedFilters: FilterState) =>
  previousFilters.assignee_type !== updatedFilters.assignee_type ||
  previousFilters.status !== updatedFilters.status ||
  previousFilters.sort_by !== updatedFilters.sort_by ||
  previousFilters.inbox_id !== updatedFilters.inbox_id;

const LabelFilterChip = ({
  title,
  isActive,
  color,
  onPress,
}: {
  title: string;
  isActive: boolean;
  color?: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'h-8 px-3 mr-2 rounded-full flex-row items-center justify-center border-[1px]',
      isActive ? 'bg-blue-800 border-blue-800' : 'bg-white border-blackA-A3',
    )}>
    {color ? (
      <Animated.View
        style={tailwind.style(
          'h-2 w-2 rounded-full mr-1.5',
          isActive ? 'bg-white' : `bg-[${color}]`,
        )}
      />
    ) : null}
    <Text
      numberOfLines={1}
      style={tailwind.style(
        'text-sm font-inter-medium-24 leading-[17px]',
        isActive ? 'text-white' : 'text-gray-900',
      )}>
      {title}
    </Text>
  </Pressable>
);

const LabelFilterCarousel = ({
  labels,
  selectedLabel,
  onLabelPress,
}: {
  labels: Label[];
  selectedLabel: string;
  onLabelPress: (label: string) => void;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={tailwind.style('px-3 pt-1 pb-2')}>
    <LabelFilterChip title="Todas" isActive={!selectedLabel} onPress={() => onLabelPress('')} />
    {labels.map(label => (
      <LabelFilterChip
        key={label.id}
        title={label.title}
        color={label.color}
        isActive={selectedLabel === label.title}
        onPress={() => onLabelPress(label.title)}
      />
    ))}
  </ScrollView>
);

const ConversationSearchHeader = ({
  labels,
  selectedLabel,
  onSearchPress,
  onLabelPress,
}: {
  labels: Label[];
  selectedLabel: string;
  onSearchPress: () => void;
  onLabelPress: (label: string) => void;
}) => (
  <>
    <Pressable onPress={onSearchPress} style={tailwind.style('pt-3 pb-1')}>
      <SearchBar
        editable={false}
        pointerEvents="none"
        placeholder={i18n.t('CONVERSATION.SEARCH_PLACEHOLDER')}
        value=""
      />
    </Pressable>
    <LabelFilterCarousel
      labels={labels}
      selectedLabel={selectedLabel}
      onLabelPress={onLabelPress}
    />
  </>
);

const ConversationList = () => {
  const { dismissAll } = useBottomSheetModal();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [appState, setAppState] = useState(AppState.currentState);

  // This is used to prevent the infinite scrolling before the list is ready
  const [isFlashListReady, setFlashListReady] = useState(false);
  // This is used for pull to refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  // This is used for pagination
  const [pageNumber, setPageNumber] = useState(1);
  const isLoadingMoreLabels = useRef(false);
  const userId = useAppSelector(selectUserId);

  // This is used to store the index of the item that is currently selected
  const { openedRowIndex } = useConversationListStateContext();

  // This is used to check if the conversations are still loading
  const isConversationsLoading = useAppSelector(selectConversationsLoading);
  // This is used to check if all the conversations are fetched
  const isAllConversationsFetched = useAppSelector(selectIsAllConversationsFetched);

  const handleRender = useCallback(({ item, index }: FlashListRenderItemType) => {
    return (
      <ConversationItemContainer
        index={index}
        conversationItem={item}
        openedRowIndex={openedRowIndex as SharedValue<number | null>}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters = useAppSelector(selectFilters);
  const labels = useAppSelector(selectAllLabels);
  const previousFilters = useRef(filters);

  // Reset last active timestamp when the conversation screen is opened
  useEffect(() => {
    AsyncStorage.removeItem(LAST_ACTIVE_TIMESTAMP_KEY);
  }, []);

  useEffect(() => {
    if (previousFilters.current !== filters) {
      const shouldRefetch = shouldRefetchForFilterChange(previousFilters.current, filters);
      previousFilters.current = filters;

      if (shouldRefetch) {
        clearAndFetchConversations(filters);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    dismissAll();
    clearAndFetchConversations(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAndFetchConversations = useCallback(async (filters: FilterState) => {
    setPageNumber(1);
    await dispatch(clearAllConversations());
    await dispatch(clearAllContacts());
    await dispatch(clearAssignableAgents());
    fetchConversations(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ListFooterComponent = () => {
    if (filters.label) return null;
    if (isAllConversationsFetched) return null;
    return (
      <Animated.View
        style={tailwind.style(
          'flex-1 items-center justify-center pt-8',
          `pb-[${TAB_BAR_HEIGHT}px]`,
        )}>
        {isAllConversationsFetched ? null : <ActivityIndicator size="small" />}
      </Animated.View>
    );
  };

  const handleRefresh = useCallback(() => {
    setFlashListReady(false);
    setIsRefreshing(true);
    clearAndFetchConversations(filters).finally(() => {
      setIsRefreshing(false);
    });
  }, [clearAndFetchConversations, filters]);

  const checkAppStateAndFetchConversations = useCallback(async () => {
    const lastActiveTimestamp = await AsyncStorage.getItem(LAST_ACTIVE_TIMESTAMP_KEY);
    if (lastActiveTimestamp) {
      const currentTimestamp = Date.now();
      const difference = currentTimestamp - parseInt(lastActiveTimestamp);
      if (difference > LAST_ACTIVE_TIMESTAMP_THRESHOLD) {
        clearAndFetchConversations(filters);
      }
    }
  }, [clearAndFetchConversations, filters]);

  // Update conversations when app comes to foreground from background
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        const routeName = getCurrentRouteName();
        if (routeName && REFRESH_SCREEN_LIST.includes(routeName)) {
          checkAppStateAndFetchConversations();
        }
      }

      if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background
        const currentTimestamp = Date.now();
        AsyncStorage.setItem(LAST_ACTIVE_TIMESTAMP_KEY, currentTimestamp.toString());
      }

      setAppState(nextAppState);
    });
    return () => {
      appStateListener?.remove();
    };
  }, [appState, checkAppStateAndFetchConversations, clearAndFetchConversations, filters]);

  const fetchConversations = useCallback(
    async (filters: FilterState, page: number = 1) => {
      const conversationFilters = {
        status: filters.status,
        assigneeType: filters.assignee_type,
        page: page,
        sortBy: filters.sort_by,
        inboxId: parseInt(filters.inbox_id),
        labels: filters.label ? [filters.label] : undefined,
      } as ConversationPayload;

      return dispatch(conversationActions.fetchConversations(conversationFilters)).unwrap();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onChangePageNumber = () => {
    const nextPageNumber = pageNumber + 1;
    setPageNumber(nextPageNumber);
    fetchConversations(filters, nextPageNumber);
  };

  const fetchLabelConversationsInBackground = useCallback(
    async (updatedFilters: FilterState) => {
      if (!updatedFilters.label || isLoadingMoreLabels.current) {
        return;
      }

      isLoadingMoreLabels.current = true;

      try {
        let nextPage = 1;
        let shouldKeepFetching = true;

        while (shouldKeepFetching) {
          const response = await fetchConversations(updatedFilters, nextPage);
          shouldKeepFetching = response.conversations.length >= 20;
          nextPage += 1;
        }

        setPageNumber(nextPage - 1);
      } finally {
        isLoadingMoreLabels.current = false;
      }
    },
    [fetchConversations],
  );

  const handleOnEndReached = () => {
    const shouldLoadMoreConversations =
      !filters.label && isFlashListReady && !isAllConversationsFetched && !isConversationsLoading;
    if (shouldLoadMoreConversations) {
      onChangePageNumber();
    }
  };

  const handleSearchPress = useCallback(() => {
    navigation.dispatch(StackActions.push('SearchScreen'));
  }, [navigation]);

  const handleLabelPress = useCallback(
    (label: string) => {
      const updatedFilters = { ...filters, label };
      dispatch(setFilters({ key: 'label', value: label }));

      if (label) {
        fetchLabelConversationsInBackground(updatedFilters);
      }
    },
    [dispatch, fetchLabelConversationsInBackground, filters],
  );

  const listHeaderComponent = useMemo(
    () => (
      <ConversationSearchHeader
        labels={labels}
        selectedLabel={filters.label}
        onSearchPress={handleSearchPress}
        onLabelPress={handleLabelPress}
      />
    ),
    [filters.label, handleLabelPress, handleSearchPress, labels],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      openedRowIndex.value = -1;
      if (!isFlashListReady) {
        runOnJS(setFlashListReady)(true);
      }
    },
  });

  const allConversations = useAppSelector(state =>
    getFilteredConversations(state, filters, userId),
  );

  const shouldShowEmptyLoader = isConversationsLoading && allConversations.length === 0;

  return shouldShowEmptyLoader ? (
    <Animated.View
      style={tailwind.style('flex-1 items-center justify-center', `pb-[${TAB_BAR_HEIGHT}px]`)}>
      <ActivityIndicator />
    </Animated.View>
  ) : allConversations.length === 0 ? (
    <Animated.ScrollView
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={tailwind.style(
        'flex-1 items-center justify-center',
        `pb-[${TAB_BAR_HEIGHT}px]`,
      )}>
      <EmptyStateIcon />
      <Animated.Text style={tailwind.style('pt-6 text-md  tracking-[0.32px] text-gray-800')}>
        {i18n.t('CONVERSATION.EMPTY')}
      </Animated.Text>
    </Animated.ScrollView>
  ) : (
    <AnimatedFlashList
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      layout={LinearTransition.springify().damping(18).stiffness(120)}
      showsVerticalScrollIndicator={false}
      data={allConversations}
      estimatedItemSize={91}
      onScroll={scrollHandler}
      onEndReached={handleOnEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={listHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      renderItem={handleRender}
      contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT - 1}px]`)}
    />
  );
};

const ConversationScreen = () => {
  const currentBottomSheet = useAppSelector(selectBottomSheetState);
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState<ConversationViewMode>('list');

  const animationConfigs = useBottomSheetSpringConfigs({
    mass: 1.2,
    stiffness: 300,
    damping: 50,
  });

  const { filtersModalSheetRef } = useRefsContext();

  const handleOnDismiss = () => {
    /**
     * Resetting the bottoms sheet state to none with a timeout
     * to avoid flickering of bottom sheet
     */
    dispatch(setBottomSheetState('none'));
    dispatch(resetActionState());
  };

  const filterSnapPoints = useMemo(() => {
    switch (currentBottomSheet) {
      case 'status':
        return [290];
      case 'sort_by':
        return [200];
      case 'assignee_type':
        return [200];
      case 'inbox_id':
        return ['70%'];
      default:
        return [250];
    }
  }, [currentBottomSheet]);

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-white')}
        barStyle={'dark-content'}
      />
      <ConversationListStateProvider>
        <ConversationHeader viewMode={viewMode} onViewModeChange={setViewMode} />
        {viewMode === 'list' ? <ConversationList /> : <SalesFunnelBoard />}
        <BottomSheetModal
          ref={filtersModalSheetRef}
          backdropComponent={BottomSheetBackdrop}
          handleIndicatorStyle={tailwind.style(
            'overflow-hidden bg-blackA-A6 w-8 h-1 rounded-[11px]',
          )}
          handleStyle={tailwind.style('p-0 h-4 pt-[5px]')}
          style={tailwind.style('rounded-[26px] overflow-hidden')}
          animationConfigs={animationConfigs}
          enablePanDownToClose
          snapPoints={filterSnapPoints}
          onDismiss={handleOnDismiss}>
          <BottomSheetWrapper>
            {currentBottomSheet === 'status' ? <StatusFilters /> : null}
            {currentBottomSheet === 'sort_by' ? <SortByFilters /> : null}
            {currentBottomSheet === 'assignee_type' ? <AssigneeTypeFilters /> : null}
            {currentBottomSheet === 'inbox_id' ? <InboxFilters /> : null}
          </BottomSheetWrapper>
        </BottomSheetModal>
        {viewMode === 'list' ? (
          <>
            <ActionBottomSheet />
            <ActionTabs />
          </>
        ) : null}
      </ConversationListStateProvider>
    </SafeAreaView>
  );
};

export default ConversationScreen;
