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
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { StackActions, useNavigation } from '@react-navigation/native';

import {
  ConversationItemContainer,
  ConversationHeader,
  TeamChatPinnedItem,
  StatusFilters,
  SortByFilters,
  InboxFilters,
  AssigneeTypeFilters,
} from './components';

import {
  ActionTabs,
  Avatar,
  BottomSheetBackdrop,
  BottomSheetHeader,
  BottomSheetWrapper,
  Icon,
  SearchBar,
} from '@/components-next';

import { EmptyStateIcon, MailIcon, UserIcon } from '@/svg-icons';
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
import { TeamChatService, TeamChatStatus } from '@/store/team-chat/teamChatService';

// The screen list thats need to be checked for refreshing the conversations list
const REFRESH_SCREEN_LIST = [SCREENS.CONVERSATION, SCREENS.INBOX, SCREENS.SETTINGS];

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

type FlashListRenderItemType = {
  item: Conversation;
  index: number;
};

const QuickCreateAction = ({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={tailwind.style(
      'flex-1 min-h-[88px] rounded-xl border-[1px] border-blackA-A3 bg-white p-3 justify-between',
    )}>
    <Animated.View
      style={tailwind.style('h-9 w-9 rounded-full bg-blue-50 items-center justify-center')}>
      <Icon icon={icon} size={20} />
    </Animated.View>
    <Animated.View>
      <Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-950')}>{title}</Text>
      <Text numberOfLines={1} style={tailwind.style('mt-0.5 text-xs text-gray-600')}>
        {description}
      </Text>
    </Animated.View>
  </Pressable>
);

const ConversationCreateSheet = ({
  recentConversations,
}: {
  recentConversations: Conversation[];
}) => (
  <BottomSheetWrapper>
    <BottomSheetHeader headerText="Iniciar conversa" />
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tailwind.style('px-4 pt-5 pb-8')}>
      <Animated.View style={tailwind.style('flex-row gap-3')}>
        <QuickCreateAction
          title="Nova campanha"
          description="Enviar para vários contatos"
          icon={<MailIcon stroke={tailwind.color('text-blue-800')} />}
          onPress={() => {}}
        />
        <QuickCreateAction
          title="Novo contato"
          description="Cadastrar e conversar"
          icon={<UserIcon stroke={tailwind.color('text-blue-800')} />}
          onPress={() => {}}
        />
      </Animated.View>

      <Text style={tailwind.style('mt-6 mb-2 text-sm font-inter-medium-24 text-gray-700')}>
        Contatos recentes
      </Text>
      {recentConversations.slice(0, 6).map(conversation => {
        const sender = conversation.meta?.sender;
        const name = sender?.name || 'Contato';
        const phone = sender?.phoneNumber || sender?.email || 'Sem identificação';

        return (
          <Pressable
            key={conversation.id}
            onPress={() => {}}
            style={tailwind.style('flex-row items-center py-3 border-b-[1px] border-blackA-A3')}>
            <Avatar
              size="2xl"
              name={name}
              src={sender?.thumbnail ? { uri: sender.thumbnail } : undefined}
            />
            <Animated.View style={tailwind.style('ml-3 flex-1')}>
              <Text numberOfLines={1} style={tailwind.style('text-base text-gray-950')}>
                {name}
              </Text>
              <Text numberOfLines={1} style={tailwind.style('mt-0.5 text-sm text-gray-600')}>
                {phone}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
      {recentConversations.length === 0 ? (
        <Text style={tailwind.style('py-6 text-center text-sm text-gray-600')}>
          Nenhum contato recente
        </Text>
      ) : null}
    </BottomSheetScrollView>
  </BottomSheetWrapper>
);

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
  teamChat,
  onTeamChatPress,
  showTeamChatShortcut,
}: {
  labels: Label[];
  selectedLabel: string;
  onSearchPress: () => void;
  onLabelPress: (label: string) => void;
  teamChat: TeamChatStatus | null;
  onTeamChatPress: () => void;
  showTeamChatShortcut: boolean;
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
    {showTeamChatShortcut && teamChat?.enabled && teamChat.inboxId ? (
      <TeamChatPinnedItem
        onPress={onTeamChatPress}
        teamName={teamChat.latestConversation?.teamName}
        message={teamChat.latestConversation?.message?.content}
        senderName={teamChat.latestConversation?.message?.senderName}
        updatedAt={teamChat.latestConversation?.updatedAt}
      />
    ) : null}
  </>
);

const ConversationList = ({ showTeamChatShortcut = true }: { showTeamChatShortcut?: boolean }) => {
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
  const [teamChat, setTeamChat] = useState<TeamChatStatus | null>(null);
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
    TeamChatService.getStatus()
      .then(setTeamChat)
      .catch(() => setTeamChat(null));
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
    Promise.all([
      clearAndFetchConversations(filters),
      TeamChatService.getStatus()
        .then(setTeamChat)
        .catch(() => setTeamChat(null)),
    ]).finally(() => {
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

  const handleTeamChatPress = useCallback(() => {
    if (!teamChat?.inboxId) return;
    navigation.dispatch(StackActions.push('TeamChatScreen', { inboxId: teamChat.inboxId }));
  }, [navigation, teamChat]);

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
        teamChat={teamChat}
        onTeamChatPress={handleTeamChatPress}
        showTeamChatShortcut={showTeamChatShortcut}
      />
    ),
    [
      filters.label,
      handleLabelPress,
      handleSearchPress,
      handleTeamChatPress,
      labels,
      showTeamChatShortcut,
      teamChat,
    ],
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

type ConversationScreenProps = {
  title?: string;
  onBack?: () => void;
  showViewModeTabs?: boolean;
};

const ConversationScreen = ({
  title,
  onBack,
  showViewModeTabs = true,
}: ConversationScreenProps) => {
  const currentBottomSheet = useAppSelector(selectBottomSheetState);
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState<ConversationViewMode>('list');
  const createConversationSheetRef = useRef<BottomSheetModal>(null);

  const animationConfigs = useBottomSheetSpringConfigs({
    mass: 1.2,
    stiffness: 300,
    damping: 50,
  });

  const { filtersModalSheetRef } = useRefsContext();
  const filters = useAppSelector(selectFilters);
  const userId = useAppSelector(selectUserId);
  const recentConversations = useAppSelector(state =>
    getFilteredConversations(state, filters, userId),
  );

  const handleCreatePress = () => {
    createConversationSheetRef.current?.present();
  };

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
        <ConversationHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          title={title}
          onBack={onBack}
          onCreatePress={!title ? handleCreatePress : undefined}
          showViewModeTabs={showViewModeTabs}
        />
        {!showViewModeTabs || viewMode === 'list' ? (
          <ConversationList showTeamChatShortcut={!title} />
        ) : (
          <SalesFunnelBoard />
        )}
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
        <BottomSheetModal
          ref={createConversationSheetRef}
          backdropComponent={BottomSheetBackdrop}
          handleIndicatorStyle={tailwind.style(
            'overflow-hidden bg-blackA-A6 w-8 h-1 rounded-[11px]',
          )}
          handleStyle={tailwind.style('p-0 h-4 pt-[5px]')}
          style={tailwind.style('rounded-[26px] overflow-hidden')}
          animationConfigs={animationConfigs}
          enablePanDownToClose
          snapPoints={['56%']}>
          <ConversationCreateSheet recentConversations={recentConversations} />
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
