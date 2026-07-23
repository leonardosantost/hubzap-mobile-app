import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import Animated from 'react-native-reanimated';
import camelCase from 'lodash/camelCase';

import { BottomSheetBackdrop, Button, Icon } from '@/components-next';
import { CaretRight, CompanyIcon, CopyIcon, EmailIcon, LocationIcon, PhoneIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { Contact, CustomAttribute } from '@/types';
import { ContactService } from '@/store/contact/contactService';
import { updateContact } from '@/store/contact/contactSlice';
import { updateConversation } from '@/store/conversation/conversationSlice';
import { Conversation } from '@/types/Conversation';
import { useAppDispatch } from '@/hooks';

type EditableContactAttributesProps = {
  contact: Contact | null;
  conversation: Conversation;
  customAttributeDefinitions: CustomAttribute[];
};

type EditableAttribute = {
  key: string;
  title: string;
  value: string;
  type: 'contact' | 'additional' | 'custom';
  icon?: React.ReactNode;
};

const buildCustomAttributes = (
  definitions: CustomAttribute[],
  customAttributes: Record<string, string>,
): EditableAttribute[] => {
  const definedAttributes = definitions
    .map(attribute => {
      const key = camelCase(attribute.attributeKey);
      if (!(key in customAttributes)) {
        return null;
      }
      return {
        key,
        title: attribute.attributeDisplayName,
        value: customAttributes[key] ?? '',
        type: 'custom' as const,
      };
    })
    .filter(Boolean) as EditableAttribute[];

  const definedKeys = new Set(definedAttributes.map(attribute => attribute.key));
  const extraAttributes = Object.entries(customAttributes)
    .filter(([key]) => !definedKeys.has(key))
    .map(([key, value]) => ({
      key,
      title: key,
      value: String(value ?? ''),
      type: 'custom' as const,
    }));

  return [...definedAttributes, ...extraAttributes];
};

export const EditableContactAttributes = ({
  contact,
  conversation,
  customAttributeDefinitions,
}: EditableContactAttributesProps) => {
  const dispatch = useAppDispatch();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [editingAttribute, setEditingAttribute] = useState<EditableAttribute | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const animationConfigs = useBottomSheetSpringConfigs({
    mass: 1,
    stiffness: 420,
    damping: 30,
  });

  const attributes = useMemo<EditableAttribute[]>(() => {
    if (!contact) {
      return [];
    }

    const additionalAttributes = contact.additionalAttributes || {};
    const baseAttributes: EditableAttribute[] = [
      {
        key: 'phoneNumber',
        title: 'Telefone',
        value: contact.phoneNumber || '',
        type: 'contact',
        icon: <PhoneIcon />,
      },
      {
        key: 'email',
        title: 'Email',
        value: contact.email || '',
        type: 'contact',
        icon: <EmailIcon />,
      },
      {
        key: 'companyName',
        title: 'Empresa',
        value: additionalAttributes.companyName || '',
        type: 'additional',
        icon: <CompanyIcon />,
      },
      {
        key: 'location',
        title: 'Localizacao',
        value:
          additionalAttributes.location ||
          [additionalAttributes.city, additionalAttributes.country].filter(Boolean).join(', '),
        type: 'additional',
        icon: <LocationIcon />,
      },
    ];

    return [
      ...baseAttributes.filter(attribute => attribute.value),
      ...buildCustomAttributes(customAttributeDefinitions, contact.customAttributes || {}),
    ];
  }, [contact, customAttributeDefinitions]);

  const handleEditPress = (attribute: EditableAttribute) => {
    setEditingAttribute(attribute);
    setEditingValue(attribute.value);
    sheetRef.current?.present();
  };

  const handleCancel = () => {
    sheetRef.current?.dismiss({ overshootClamping: true });
    setEditingAttribute(null);
  };

  const handleSave = async () => {
    if (!contact || !editingAttribute) {
      return;
    }

    const updatedContact = {
      ...contact,
      ...(editingAttribute.type === 'contact' ? { [editingAttribute.key]: editingValue } : {}),
      additionalAttributes:
        editingAttribute.type === 'additional'
          ? {
              ...contact.additionalAttributes,
              [editingAttribute.key]: editingValue,
            }
          : contact.additionalAttributes,
      customAttributes:
        editingAttribute.type === 'custom'
          ? {
              ...contact.customAttributes,
              [editingAttribute.key]: editingValue,
            }
          : contact.customAttributes,
    } as Contact;

    dispatch(updateContact(updatedContact));
    dispatch(
      updateConversation({
        ...conversation,
        meta: {
          ...conversation.meta,
          sender: updatedContact,
        },
      }),
    );
    sheetRef.current?.dismiss({ overshootClamping: true });

    const payload =
      editingAttribute.type === 'custom'
        ? { custom_attributes: updatedContact.customAttributes }
        : editingAttribute.type === 'additional'
          ? { additional_attributes: updatedContact.additionalAttributes }
          : {
              [editingAttribute.key === 'phoneNumber' ? 'phone_number' : editingAttribute.key]:
                editingValue,
            };

    try {
      const responseContact = await ContactService.updateContact(contact.id, payload);
      dispatch(updateContact(responseContact));
      dispatch(
        updateConversation({
          ...conversation,
          meta: {
            ...conversation.meta,
            sender: responseContact,
          },
        }),
      );
    } catch {
      dispatch(updateContact(contact));
      dispatch(
        updateConversation({
          ...conversation,
          meta: {
            ...conversation.meta,
            sender: contact,
          },
        }),
      );
      // The global API interceptor already shows the error toast.
    } finally {
      setEditingAttribute(null);
    }
  };

  if (!attributes.length) {
    return null;
  }

  return (
    <Animated.View>
      <Animated.View style={tailwind.style('pl-4 pb-3')}>
        <Animated.Text
          style={tailwind.style(
            'text-sm font-inter-medium-24 leading-[16px] tracking-[0.32px] text-gray-700',
          )}>
          Atributos do contato
        </Animated.Text>
      </Animated.View>
      <Animated.View style={[tailwind.style('mx-4 rounded-[13px] bg-white'), styles.shadow]}>
        {attributes.map((attribute, index) => {
          const isLastItem = index === attributes.length - 1;
          return (
            <Pressable
              key={`${attribute.type}-${attribute.key}`}
              onPress={() => handleEditPress(attribute)}
              style={({ pressed }) =>
                tailwind.style(
                  pressed ? 'bg-gray-100' : '',
                  index === 0 ? 'rounded-t-[13px]' : '',
                  isLastItem ? 'rounded-b-[13px]' : '',
                )
              }>
              <Animated.View style={tailwind.style('flex-row items-center pl-3')}>
                {attribute.icon ? <Icon icon={attribute.icon} size={24} /> : null}
                <Animated.View
                  style={tailwind.style(
                    'ml-3 flex-1 flex-row items-center justify-between py-[11px]',
                    !isLastItem ? 'border-b-[1px] border-b-blackA-A3' : '',
                  )}>
                  <Animated.View style={tailwind.style('flex-1 pr-3')}>
                    <Animated.Text
                      numberOfLines={1}
                      style={tailwind.style(
                        'text-base font-inter-420-20 leading-[22px] tracking-[0.16px] text-gray-950',
                      )}>
                      {attribute.title}
                    </Animated.Text>
                    <Animated.Text
                      numberOfLines={1}
                      style={tailwind.style(
                        'text-base font-inter-normal-20 leading-[22px] tracking-[0.16px] text-gray-900',
                      )}>
                      {attribute.value}
                    </Animated.Text>
                  </Animated.View>
                  <Animated.View style={tailwind.style('flex-row items-center pr-3')}>
                    <Icon icon={<CopyIcon />} size={20} />
                    <Icon icon={<CaretRight />} size={20} />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Pressable>
          );
        })}
      </Animated.View>
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={BottomSheetBackdrop}
        handleIndicatorStyle={tailwind.style('overflow-hidden bg-blackA-A6 w-8 h-1 rounded-[11px]')}
        handleStyle={tailwind.style('p-0 h-4 pt-[5px]')}
        style={tailwind.style('rounded-[26px] overflow-hidden')}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        snapPoints={[260]}>
        <BottomSheetView style={tailwind.style('px-4 pt-4')}>
          <Animated.Text
            style={tailwind.style(
              'pb-3 text-lg font-inter-medium-24 leading-[24px] text-gray-950',
            )}>
            {editingAttribute?.title}
          </Animated.Text>
          <TextInput
            value={editingValue}
            onChangeText={setEditingValue}
            autoFocus
            style={tailwind.style(
              'min-h-[48px] rounded-[13px] border-[1px] border-blackA-A3 px-3 text-base font-inter-normal-20 text-gray-950',
            )}
          />
          <Animated.View style={tailwind.style('flex-row gap-3 pt-5')}>
            <Animated.View style={tailwind.style('flex-1')}>
              <Button variant="secondary" text="Cancelar" handlePress={handleCancel} />
            </Animated.View>
            <Animated.View style={tailwind.style('flex-1')}>
              <Button text="Salvar" handlePress={handleSave} />
            </Animated.View>
          </Animated.View>
        </BottomSheetView>
      </BottomSheetModal>
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
