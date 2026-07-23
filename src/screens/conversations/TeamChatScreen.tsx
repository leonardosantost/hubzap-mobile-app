import React, { useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import ConversationScreen from './ConversationScreen';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectFilters, setFilters } from '@/store/conversation/conversationFilterSlice';

export const TeamChatScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: string; params: { inboxId: number } }>();
  const filters = useAppSelector(selectFilters);
  const previousInboxId = useRef(filters.inbox_id);

  useEffect(() => {
    const inboxIdBeforeNavigation = previousInboxId.current;
    dispatch(setFilters({ key: 'inbox_id', value: String(route.params.inboxId) }));
    return () => {
      dispatch(setFilters({ key: 'inbox_id', value: inboxIdBeforeNavigation }));
    };
  }, [dispatch, route.params.inboxId]);

  return (
    <ConversationScreen
      title="Chat da Equipe"
      onBack={() => navigation.goBack()}
      showViewModeTabs={false}
    />
  );
};
