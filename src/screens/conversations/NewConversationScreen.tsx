import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Icon, SearchBar } from '@/components-next';
import { useAppSelector } from '@/hooks';
import { selectAllContacts } from '@/store/contact/contactSelectors';
import { tailwind } from '@/theme';
import type { Contact } from '@/types/Contact';
import { ChevronLeft, NotificationIcon, UserIcon } from '@/svg-icons';

const getContactSubtitle = (contact: Contact) =>
  [contact.email, contact.phoneNumber].filter(Boolean).join('  |  ') || 'Contato';

const ActionButton = ({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) =>
      tailwind.style(
        'flex-1 h-[76px] rounded-[12px] border-[1px] border-blackA-A3 bg-white px-3 py-3',
        pressed ? 'bg-gray-50' : '',
      )
    }>
    <Icon icon={icon} size={24} />
    <Text
      numberOfLines={1}
      style={tailwind.style('mt-2 text-sm font-inter-medium-24 leading-[17px] text-gray-950')}>
      {title}
    </Text>
  </Pressable>
);

const ContactRow = ({ contact, onPress }: { contact: Contact; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) =>
      tailwind.style(
        'flex-row items-center px-4 py-3 border-b-[1px] border-b-blackA-A3',
        pressed ? 'bg-gray-50' : '',
      )
    }>
    <Avatar
      size="xl"
      name={contact.name || ''}
      src={contact.thumbnail ? { uri: contact.thumbnail } : undefined}
    />
    <Text
      numberOfLines={1}
      style={tailwind.style(
        'ml-3 flex-1 text-base font-inter-medium-24 leading-[19px] text-gray-950',
      )}>
      {contact.name || 'Contato sem nome'}
    </Text>
    <Text
      numberOfLines={1}
      style={tailwind.style(
        'ml-2 max-w-[42%] text-sm font-inter-normal-20 leading-[18px] text-gray-700',
      )}>
      {getContactSubtitle(contact)}
    </Text>
  </Pressable>
);

export const NewConversationScreen = () => {
  const navigation = useNavigation();
  const contacts = useAppSelector(selectAllContacts);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return contacts
      .filter(contact => {
        if (!normalizedQuery) {
          return true;
        }

        return [contact.name, contact.email, contact.phoneNumber]
          .filter(Boolean)
          .some(value => value?.toLowerCase().includes(normalizedQuery));
      })
      .sort((first, second) => {
        const firstActivity = first.lastActivityAt || first.createdAt || 0;
        const secondActivity = second.lastActivityAt || second.createdAt || 0;
        return secondActivity - firstActivity;
      })
      .slice(0, 30);
  }, [contacts, searchQuery]);

  const handleContactPress = (contactId: number) => {
    navigation.dispatch(StackActions.push('ContactDetails', { contactId }));
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <ContactRow contact={item} onPress={() => handleContactPress(item.id)} />
  );

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={filteredContacts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderContact}
        ListHeaderComponent={
          <>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={16}
              style={tailwind.style('self-start px-4 pt-2 pb-3')}>
              <Icon size={24} icon={<ChevronLeft stroke={tailwind.color('text-gray-950')} />} />
            </Pressable>
            <SearchBar
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Buscar contato"
            />
            <View style={tailwind.style('flex-row gap-3 px-4 pt-5 pb-5')}>
              <ActionButton
                title="Nova campanha"
                icon={<NotificationIcon stroke={tailwind.color('text-blue-800')} />}
                onPress={() => {}}
              />
              <ActionButton
                title="Novo contato"
                icon={<UserIcon stroke={tailwind.color('text-blue-800')} />}
                onPress={() => {}}
              />
            </View>
            <Text
              style={tailwind.style(
                'px-4 pb-1 text-sm font-inter-medium-24 leading-[17px] text-gray-700',
              )}>
              Contatos recentes
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text
            style={tailwind.style(
              'px-4 py-6 text-center text-base font-inter-normal-20 text-gray-700',
            )}>
            Nenhum contato encontrado
          </Text>
        }
        contentContainerStyle={tailwind.style('pb-6')}
      />
    </SafeAreaView>
  );
};
