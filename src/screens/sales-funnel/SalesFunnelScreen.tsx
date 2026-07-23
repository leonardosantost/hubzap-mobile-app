import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Animated as RNAnimated,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';

import { Avatar } from '@/components-next';
import { TAB_BAR_HEIGHT } from '@/constants';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { conversationActions } from '@/store/conversation/conversationActions';
import { updateConversation } from '@/store/conversation/conversationSlice';
import { selectAllConversations } from '@/store/conversation/conversationSelectors';
import { selectAllLabels } from '@/store/label/labelSelectors';
import { tailwind } from '@/theme';
import type { Conversation, Label } from '@/types';
import { formatConversationListTime } from '@/utils/dateTimeUtils';
import { getLastMessage } from '@/utils';

const PAGE_SIZE = 20;
const MAX_PAGES_PER_LABEL = 2;
const MOVE_THRESHOLD = 72;
const EDGE_MOVE_THRESHOLD = 44;
const SCREEN_WIDTH = Dimensions.get('screen').width;
const COLUMN_GAP = 10;
const COLUMN_WIDTH = SCREEN_WIDTH - 54;
const SNAP_INTERVAL = COLUMN_WIDTH + COLUMN_GAP;

const hexToRgba = (hex: string, alpha: number) => {
  const normalizedHex = hex.replace('#', '');
  const parsedHex =
    normalizedHex.length === 3
      ? normalizedHex
          .split('')
          .map(char => `${char}${char}`)
          .join('')
      : normalizedHex;

  if (parsedHex.length !== 6) {
    return `rgba(0, 129, 241, ${alpha})`;
  }

  const value = Number.parseInt(parsedHex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getConversationPreview = (conversation: Conversation) => {
  const lastMessage = getLastMessage(conversation);
  if (lastMessage?.content) {
    return lastMessage.content.replace(/\s+/g, ' ').trim();
  }
  if (lastMessage?.attachments?.length) {
    return 'Anexo';
  }
  return 'Sem mensagem';
};

type FunnelCardProps = {
  conversation: Conversation;
  sourceLabel: string;
  columnIndex: number;
  columnCount: number;
  onOpen: (conversationId: number) => void;
  onPreviewColumn: (targetIndex: number) => void;
  onDragStart: (
    conversation: Conversation,
    layout: { x: number; y: number; width: number },
  ) => void;
  onDragMove: (translation: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onMove: (conversation: Conversation, sourceLabel: string, targetIndex: number) => void;
};

type DragOverlayState = {
  conversation: Conversation;
  x: number;
  y: number;
  width: number;
  translateX: number;
  translateY: number;
} | null;

const FunnelCardContent = ({ conversation }: { conversation: Conversation }) => {
  const sender = conversation.meta.sender;
  const assignee = conversation.meta.assignee;

  return (
    <Animated.View style={tailwind.style('flex-row items-start gap-3')}>
      <Avatar
        size="lg"
        name={sender?.name || ''}
        src={sender?.thumbnail ? { uri: sender.thumbnail } : undefined}
      />
      <Animated.View style={tailwind.style('flex-1')}>
        <Animated.View style={tailwind.style('flex-row items-center justify-between gap-2')}>
          <Animated.Text
            numberOfLines={1}
            style={tailwind.style(
              'flex-1 text-base font-inter-medium-24 leading-[22px] text-gray-950',
            )}>
            {sender?.name || `Conversa #${conversation.id}`}
          </Animated.Text>
          <Animated.Text
            style={tailwind.style(
              'text-xs font-inter-medium-24 leading-[16px]',
              conversation.unreadCount > 0 ? 'text-blue-800' : 'text-gray-700',
            )}>
            {formatConversationListTime(conversation.timestamp)}
          </Animated.Text>
        </Animated.View>
        <Animated.Text
          numberOfLines={2}
          style={tailwind.style('pt-1 text-sm font-inter-normal-20 leading-[18px] text-gray-900')}>
          {getConversationPreview(conversation)}
        </Animated.Text>
        <Animated.View style={tailwind.style('mt-3 flex-row items-center justify-between')}>
          <Animated.Text
            numberOfLines={1}
            style={tailwind.style('text-xs font-inter-normal-20 leading-[16px] text-gray-700')}>
            {assignee?.name || 'Sem agente'}
          </Animated.Text>
          {conversation.unreadCount > 0 ? (
            <Animated.View
              style={tailwind.style(
                'min-w-[22px] h-[22px] items-center justify-center rounded-full bg-blue-800 px-1.5',
              )}>
              <Animated.Text
                style={tailwind.style('text-xs font-inter-medium-24 leading-[16px] text-white')}>
                {conversation.unreadCount}
              </Animated.Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const FunnelCard = ({
  conversation,
  sourceLabel,
  columnIndex,
  columnCount,
  onOpen,
  onPreviewColumn,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMove,
}: FunnelCardProps) => {
  const pan = useRef(new RNAnimated.ValueXY()).current;
  const isDraggingRef = useRef(false);
  const [isDragging, setDragging] = useState(false);
  const dragTargetRef = useRef({ index: columnIndex, lastPreviewAt: 0 });

  const handleMoveRelease = useCallback(
    (dx: number) => {
      const dragTargetIndex = dragTargetRef.current.index;
      if (dragTargetIndex !== columnIndex) {
        onMove(conversation, sourceLabel, dragTargetIndex);
        return;
      }

      if (dx > MOVE_THRESHOLD && columnIndex < columnCount - 1) {
        onMove(conversation, sourceLabel, columnIndex + 1);
      } else if (dx < -MOVE_THRESHOLD && columnIndex > 0) {
        onMove(conversation, sourceLabel, columnIndex - 1);
      }
    },
    [columnCount, columnIndex, conversation, onMove, sourceLabel],
  );

  const resetDragState = useCallback(() => {
    isDraggingRef.current = false;
    dragTargetRef.current = { index: columnIndex, lastPreviewAt: 0 };
    setDragging(false);
    onDragEnd();
    RNAnimated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 7,
      tension: 80,
    }).start();
  }, [columnIndex, onDragEnd, pan]);

  const handlePreviewColumn = useCallback(
    (targetIndex: number) => {
      const now = Date.now();
      const { index: currentTarget, lastPreviewAt } = dragTargetRef.current;

      if (
        targetIndex < 0 ||
        targetIndex >= columnCount ||
        targetIndex === currentTarget ||
        now - lastPreviewAt < 420
      ) {
        return;
      }

      dragTargetRef.current = { index: targetIndex, lastPreviewAt: now };
      onPreviewColumn(targetIndex);
    },
    [columnCount, onPreviewColumn],
  );

  const handleDragMove = useCallback(
    (gesture: { dx: number; moveX: number }) => {
      if (!isDraggingRef.current) {
        return;
      }

      const currentTargetIndex = dragTargetRef.current.index;
      if (
        (gesture.moveX >= SCREEN_WIDTH - EDGE_MOVE_THRESHOLD || gesture.dx > MOVE_THRESHOLD) &&
        currentTargetIndex < columnCount - 1
      ) {
        handlePreviewColumn(currentTargetIndex + 1);
      } else if (
        (gesture.moveX <= EDGE_MOVE_THRESHOLD || gesture.dx < -MOVE_THRESHOLD) &&
        currentTargetIndex > 0
      ) {
        handlePreviewColumn(currentTargetIndex - 1);
      }
    },
    [columnCount, handlePreviewColumn],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => isDraggingRef.current,
        onPanResponderMove: (_, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy });
          onDragMove({ x: gesture.dx, y: gesture.dy });
          handleDragMove(gesture);
        },
        onPanResponderRelease: (_, gesture) => {
          handleMoveRelease(gesture.dx);
          resetDragState();
        },
        onPanResponderTerminate: () => {
          resetDragState();
        },
      }),
    [handleDragMove, handleMoveRelease, onDragMove, pan, resetDragState],
  );

  const handleLongPress = (event: GestureResponderEvent) => {
    isDraggingRef.current = true;
    dragTargetRef.current = { index: columnIndex, lastPreviewAt: 0 };
    setDragging(true);
    onDragStart(conversation, {
      x: 16,
      y: Math.max(64, event.nativeEvent.pageY - 58),
      width: COLUMN_WIDTH,
    });
  };

  return (
    <RNAnimated.View
      {...panResponder.panHandlers}
      style={[
        tailwind.style(
          'mb-3 rounded-[13px] border-[1px] border-blackA-A3 bg-white px-3 py-3',
          isDragging ? 'opacity-25' : '',
        ),
        {
          transform: pan.getTranslateTransform(),
          shadowColor: '#00000040',
          shadowOffset: { width: 0, height: isDragging ? 8 : 1 },
          shadowRadius: isDragging ? 16 : 3,
          shadowOpacity: isDragging ? 0.24 : 0.12,
          elevation: isDragging ? 6 : 2,
        },
      ]}>
      <Pressable
        delayLongPress={180}
        onLongPress={handleLongPress}
        onPress={() => onOpen(conversation.id)}>
        <FunnelCardContent conversation={conversation} />
      </Pressable>
    </RNAnimated.View>
  );
};

type FunnelColumnProps = {
  label: Label;
  conversations: Conversation[];
  columnIndex: number;
  columnCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (conversationId: number) => void;
  onPreviewColumn: (targetIndex: number) => void;
  onDragStart: (
    conversation: Conversation,
    layout: { x: number; y: number; width: number },
  ) => void;
  onDragMove: (translation: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onMove: (conversation: Conversation, sourceLabel: string, targetIndex: number) => void;
};

const FunnelColumn = ({
  label,
  conversations,
  columnIndex,
  columnCount,
  refreshing,
  onRefresh,
  onOpen,
  onPreviewColumn,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMove,
}: FunnelColumnProps) => {
  const backgroundColor = hexToRgba(label.color, 0.1);

  return (
    <Animated.View
      style={[tailwind.style('flex-1 pt-3'), { width: COLUMN_WIDTH, marginRight: COLUMN_GAP }]}>
      <Animated.View style={[tailwind.style('mb-3 rounded-[13px] px-4 py-3'), { backgroundColor }]}>
        <Animated.View style={tailwind.style('flex-row items-center justify-between')}>
          <Animated.Text
            numberOfLines={1}
            style={tailwind.style(
              'flex-1 text-lg font-inter-medium-24 leading-[24px] text-gray-950',
            )}>
            {label.title}
          </Animated.Text>
          <Animated.Text
            style={tailwind.style('text-sm font-inter-medium-24 leading-[18px] text-gray-800')}>
            {conversations.length}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT + 16}px]`)}>
        {conversations.length ? (
          conversations.map(conversation => (
            <FunnelCard
              key={conversation.id}
              conversation={conversation}
              sourceLabel={label.title}
              columnIndex={columnIndex}
              columnCount={columnCount}
              onOpen={onOpen}
              onPreviewColumn={onPreviewColumn}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
              onMove={onMove}
            />
          ))
        ) : (
          <Animated.View style={tailwind.style('items-center justify-center py-16')}>
            <Animated.Text
              style={tailwind.style(
                'text-center text-sm font-inter-normal-20 leading-[19px] text-gray-700',
              )}>
              Nenhuma conversa nesta etiqueta
            </Animated.Text>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

export const SalesFunnelBoard = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const funnelScrollRef = useRef<ScrollView>(null);
  const labels = useAppSelector(selectAllLabels);
  const conversations = useAppSelector(selectAllConversations);
  const [isRefreshing, setRefreshing] = useState(false);
  const [isInitialLoading, setInitialLoading] = useState(conversations.length === 0);
  const [dragOverlay, setDragOverlay] = useState<DragOverlayState>(null);

  const fetchFunnelConversations = useCallback(async () => {
    if (!labels.length) {
      setInitialLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all(
        labels.map(async label => {
          let page = 1;
          let shouldFetch = true;
          while (shouldFetch && page <= MAX_PAGES_PER_LABEL) {
            const response = await dispatch(
              conversationActions.fetchConversations({
                status: 'open',
                assigneeType: 'all',
                sortBy: 'latest',
                inboxId: 0,
                page,
                labels: [label.title],
              }),
            ).unwrap();
            shouldFetch = response.conversations.length >= PAGE_SIZE;
            page += 1;
          }
        }),
      );
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [dispatch, labels]);

  useEffect(() => {
    fetchFunnelConversations();
  }, [fetchFunnelConversations]);

  useEffect(() => {
    if (conversations.length > 0) {
      setInitialLoading(false);
    }
  }, [conversations.length]);

  const conversationsByLabel = useMemo(() => {
    return labels.reduce<Record<string, Conversation[]>>((accumulator, label) => {
      accumulator[label.title] = conversations
        .filter(
          conversation =>
            conversation.status === 'open' && conversation.labels.includes(label.title),
        )
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
      return accumulator;
    }, {});
  }, [conversations, labels]);

  const handleOpenConversation = useCallback(
    (conversationId: number) => {
      navigation.dispatch(StackActions.push('ChatScreen', { conversationId }));
    },
    [navigation],
  );

  const handleMoveConversation = useCallback(
    (conversation: Conversation, sourceLabel: string, targetIndex: number) => {
      const targetLabel = labels[targetIndex];
      if (!targetLabel || targetLabel.title === sourceLabel) {
        return;
      }

      const updatedLabels = Array.from(
        new Set([...conversation.labels.filter(label => label !== sourceLabel), targetLabel.title]),
      );

      dispatch(updateConversation({ ...conversation, labels: updatedLabels }));
      dispatch(
        conversationActions.addOrUpdateConversationLabels({
          conversationId: conversation.id,
          labels: updatedLabels,
        }),
      );
      funnelScrollRef.current?.scrollTo({ x: targetIndex * SNAP_INTERVAL, animated: true });
    },
    [dispatch, labels],
  );

  const handlePreviewColumn = useCallback((targetIndex: number) => {
    funnelScrollRef.current?.scrollTo({ x: targetIndex * SNAP_INTERVAL, animated: true });
  }, []);

  const handleDragStart = useCallback(
    (conversation: Conversation, layout: { x: number; y: number; width: number }) => {
      setDragOverlay({
        conversation,
        x: layout.x,
        y: layout.y,
        width: layout.width,
        translateX: 0,
        translateY: 0,
      });
    },
    [],
  );

  const handleDragMove = useCallback((translation: { x: number; y: number }) => {
    setDragOverlay(currentOverlay =>
      currentOverlay
        ? {
            ...currentOverlay,
            translateX: translation.x,
            translateY: translation.y,
          }
        : currentOverlay,
    );
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverlay(null);
  }, []);

  if (isInitialLoading) {
    return (
      <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
        <ActivityIndicator style={tailwind.style('flex-1')} />
      </SafeAreaView>
    );
  }

  return (
    <Animated.View style={tailwind.style('flex-1 bg-white')}>
      {labels.length ? (
        <ScrollView
          ref={funnelScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          contentContainerStyle={tailwind.style('pl-4 pr-10')}
          style={tailwind.style('flex-1')}>
          {labels.map((label, index) => (
            <FunnelColumn
              key={label.id}
              label={label}
              conversations={conversationsByLabel[label.title] || []}
              columnIndex={index}
              columnCount={labels.length}
              refreshing={isRefreshing}
              onRefresh={fetchFunnelConversations}
              onOpen={handleOpenConversation}
              onPreviewColumn={handlePreviewColumn}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onMove={handleMoveConversation}
            />
          ))}
        </ScrollView>
      ) : (
        <Animated.View style={tailwind.style('flex-1 items-center justify-center px-8')}>
          <Animated.Text
            style={tailwind.style(
              'text-center text-base font-inter-normal-20 leading-[22px] text-gray-700',
            )}>
            Nenhuma etiqueta encontrada para montar o funil.
          </Animated.Text>
        </Animated.View>
      )}
      {dragOverlay ? (
        <RNAnimated.View
          pointerEvents="none"
          style={[
            tailwind.style(
              'absolute z-50 rounded-[13px] border-[1px] border-blackA-A3 bg-white px-3 py-3',
            ),
            {
              left: dragOverlay.x,
              top: dragOverlay.y,
              width: dragOverlay.width,
              transform: [
                { translateX: dragOverlay.translateX },
                { translateY: dragOverlay.translateY },
              ],
              shadowColor: '#00000040',
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 16,
              shadowOpacity: 0.24,
              elevation: 8,
            },
          ]}>
          <FunnelCardContent conversation={dragOverlay.conversation} />
        </RNAnimated.View>
      ) : null}
    </Animated.View>
  );
};

const SalesFunnelScreen = () => {
  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <SalesFunnelBoard />
    </SafeAreaView>
  );
};

export default SalesFunnelScreen;
