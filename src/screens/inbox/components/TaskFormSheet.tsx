import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  Avatar,
  BottomSheetBackdrop,
  BottomSheetHeader,
  BottomSheetWrapper,
} from '@/components-next';
import { Button } from '@/components-next/button/Button';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { taskActions } from '@/store/task/taskActions';
import { selectTaskAgents, selectTasksSaving } from '@/store/task/taskSelectors';
import { TaskService } from '@/store/task/taskService';
import type { Contact } from '@/types';
import type { ConversationTask } from '@/types/Task';
import { tailwind } from '@/theme';

type TaskFormSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  selectedDate: Date;
  tasks: ConversationTask[];
  onSaved: () => void;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

const timeSlots = Array.from({ length: 21 }, (_, index) => {
  const hour = 8 + Math.floor(index / 2);
  const minute = index % 2 ? 30 : 0;
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
});

export const TaskFormSheet = ({ sheetRef, selectedDate, tasks, onSaved }: TaskFormSheetProps) => {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(selectTaskAgents);
  const isSaving = useAppSelector(selectTasksSaving);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | undefined>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    if (sheetRef.current) {
      setDueDate(selectedDate);
    }
  }, [selectedDate, sheetRef]);

  useEffect(() => {
    if (contactQuery.trim().length < 2) {
      setContactResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      TaskService.searchContacts(contactQuery)
        .then(setContactResults)
        .catch(() => setContactResults([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [contactQuery]);

  const busySlots = useMemo(() => {
    if (!assigneeId) return new Set<string>();
    return new Set(
      tasks
        .filter(task => task.assignee?.id === assigneeId)
        .map(task => new Date(task.dueAt))
        .filter(date => date.toDateString() === dueDate.toDateString())
        .map(date => `${date.getHours()}:${date.getMinutes()}`),
    );
  }, [assigneeId, dueDate, tasks]);

  const visibleSlots = onlyAvailable
    ? timeSlots.filter(slot => !busySlots.has(`${slot.hour}:${slot.minute}`))
    : timeSlots;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssigneeId(undefined);
    setContact(null);
    setContactQuery('');
    setContactResults([]);
    setOnlyAvailable(false);
  };

  const selectTime = (hour: number, minute: number) => {
    const nextDate = new Date(dueDate);
    nextDate.setHours(hour, minute, 0, 0);
    setDueDate(nextDate);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    await dispatch(
      taskActions.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        dueAt: dueDate.toISOString(),
        assigneeId,
        contactId: contact?.id,
      }),
    ).unwrap();
    sheetRef.current?.dismiss();
    resetForm();
    onSaved();
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['88%']}
        enablePanDownToClose
        backdropComponent={BottomSheetBackdrop}
        onDismiss={resetForm}
        handleIndicatorStyle={tailwind.style('bg-blackA-A6 w-8 h-1 rounded-[11px]')}>
        <BottomSheetWrapper>
          <BottomSheetHeader headerText="Nova tarefa" />
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tailwind.style('px-4 pt-5 pb-10')}>
            <Animated.Text
              style={tailwind.style('mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
              Título
            </Animated.Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="O que precisa ser feito?"
              placeholderTextColor={tailwind.color('text-gray-500')}
              style={tailwind.style(
                'border-[1px] border-blackA-A3 rounded-lg px-3 py-3 text-base text-gray-950',
              )}
            />

            <Animated.Text
              style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
              Descrição
            </Animated.Text>
            <TextInput
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Adicionar detalhes"
              placeholderTextColor={tailwind.color('text-gray-500')}
              style={tailwind.style(
                'min-h-[84px] border-[1px] border-blackA-A3 rounded-lg px-3 py-3 text-base text-gray-950',
              )}
            />

            <Animated.Text
              style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
              Agente
            </Animated.Text>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tailwind.style('gap-2')}>
              <Pressable
                onPress={() => setAssigneeId(undefined)}
                style={tailwind.style(
                  'px-3 py-2 rounded-full border-[1px]',
                  !assigneeId ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3',
                )}>
                <Animated.Text
                  style={tailwind.style(
                    'text-sm',
                    !assigneeId ? 'text-blue-700' : 'text-gray-700',
                  )}>
                  Todos
                </Animated.Text>
              </Pressable>
              {agents.map(agent => (
                <Pressable
                  key={agent.id}
                  onPress={() => setAssigneeId(agent.id)}
                  style={tailwind.style(
                    'px-3 py-2 rounded-full border-[1px]',
                    assigneeId === agent.id ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3',
                  )}>
                  <Animated.Text
                    style={tailwind.style(
                      'text-sm',
                      assigneeId === agent.id ? 'text-blue-700' : 'text-gray-700',
                    )}>
                    {agent.name}
                  </Animated.Text>
                </Pressable>
              ))}
            </Animated.ScrollView>

            <Animated.Text
              style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
              Data e hora
            </Animated.Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={tailwind.style('border-[1px] border-blackA-A3 rounded-lg px-3 py-3')}>
              <Animated.Text style={tailwind.style('text-base text-gray-950')}>
                {formatDate(dueDate)}
              </Animated.Text>
            </Pressable>
            <Animated.View style={tailwind.style('mt-3 flex-row items-center justify-between')}>
              <Animated.Text style={tailwind.style('text-sm text-gray-800')}>
                Somente horários disponíveis
              </Animated.Text>
              <Switch
                value={onlyAvailable}
                onValueChange={setOnlyAvailable}
                trackColor={{ true: tailwind.color('bg-blue-700') }}
              />
            </Animated.View>
            <Animated.View style={tailwind.style('mt-3 flex-row flex-wrap gap-2')}>
              {visibleSlots.map(slot => {
                const isSelected =
                  dueDate.getHours() === slot.hour && dueDate.getMinutes() === slot.minute;
                return (
                  <Pressable
                    key={slot.label}
                    onPress={() => selectTime(slot.hour, slot.minute)}
                    style={tailwind.style(
                      'w-[68px] py-2 rounded-md border-[1px] items-center',
                      isSelected ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3',
                    )}>
                    <Animated.Text
                      style={tailwind.style(
                        'text-sm',
                        isSelected ? 'text-blue-700' : 'text-gray-700',
                      )}>
                      {slot.label}
                    </Animated.Text>
                  </Pressable>
                );
              })}
            </Animated.View>

            <Animated.Text
              style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
              Contato
            </Animated.Text>
            {contact ? (
              <Pressable
                onPress={() => setContact(null)}
                style={tailwind.style(
                  'flex-row items-center border-[1px] border-blue-200 bg-blue-50 rounded-lg px-3 py-2',
                )}>
                <Avatar
                  size="xs"
                  src={contact.thumbnail ? { uri: contact.thumbnail } : undefined}
                  name={contact.name || ''}
                />
                <Animated.Text style={tailwind.style('ml-2 flex-1 text-base text-blue-700')}>
                  {contact.name}
                </Animated.Text>
                <Animated.Text style={tailwind.style('text-sm text-blue-700')}>
                  Remover
                </Animated.Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  value={contactQuery}
                  onChangeText={setContactQuery}
                  placeholder="Buscar contato"
                  placeholderTextColor={tailwind.color('text-gray-500')}
                  style={tailwind.style(
                    'border-[1px] border-blackA-A3 rounded-lg px-3 py-3 text-base text-gray-950',
                  )}
                />
                {contactResults.map(result => (
                  <Pressable
                    key={result.id}
                    onPress={() => {
                      setContact(result);
                      setContactQuery('');
                      setContactResults([]);
                    }}
                    style={tailwind.style(
                      'flex-row items-center py-3 border-b-[1px] border-blackA-A3',
                    )}>
                    <Avatar
                      size="xs"
                      src={result.thumbnail ? { uri: result.thumbnail } : undefined}
                      name={result.name || ''}
                    />
                    <Animated.Text style={tailwind.style('ml-2 text-base text-gray-950')}>
                      {result.name}
                    </Animated.Text>
                  </Pressable>
                ))}
              </>
            )}

            <Animated.View style={tailwind.style('mt-7')}>
              <Button
                text={isSaving ? 'Salvando...' : 'Criar tarefa'}
                handlePress={handleSave}
                disabled={!title.trim() || isSaving}
              />
              {isSaving ? <ActivityIndicator style={tailwind.style('mt-3')} /> : null}
            </Animated.View>
          </BottomSheetScrollView>
        </BottomSheetWrapper>
      </BottomSheetModal>
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={dueDate}
        onConfirm={date => {
          const nextDate = new Date(dueDate);
          nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          setDueDate(nextDate);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </>
  );
};
