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
import { CatalogService } from '@/store/catalog/catalogService';
import {
  selectSchedulingAgentIds,
  selectSchedulingBusinessDays,
  selectSchedulingHours,
} from '@/store/app-features/appFeaturesSelectors';
import type { Contact } from '@/types';
import type { CatalogItem } from '@/types/CatalogItem';
import type { ConversationTask } from '@/types/Task';
import { tailwind } from '@/theme';

type TaskFormSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  selectedDate: Date;
  tasks: ConversationTask[];
  onSaved: () => void;
  initialContact?: Contact | null;
  initialContactKey?: number;
  isAppointmentMode?: boolean;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

export const TaskFormSheet = ({
  sheetRef,
  selectedDate,
  tasks,
  onSaved,
  initialContact,
  initialContactKey,
  isAppointmentMode = false,
}: TaskFormSheetProps) => {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(selectTaskAgents);
  const isSaving = useAppSelector(selectTasksSaving);
  const schedulingAgentIds = useAppSelector(selectSchedulingAgentIds);
  const schedulingBusinessDays = useAppSelector(selectSchedulingBusinessDays);
  const { startHour, endHour } = useAppSelector(selectSchedulingHours);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | undefined>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(isAppointmentMode);
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();

  const selectedService = services.find(service => service.id === selectedServiceId);
  const durationMinutes = selectedService?.durationMinutes || 30;
  const availableAgents = useMemo(() => {
    if (!isAppointmentMode || schedulingAgentIds.length === 0) return agents;
    return agents.filter(agent => schedulingAgentIds.includes(agent.id));
  }, [agents, isAppointmentMode, schedulingAgentIds]);

  const timeSlots = useMemo(() => {
    const start = isAppointmentMode ? startHour : 8;
    const end = isAppointmentMode ? endHour : 18;
    const slots: { hour: number; minute: number; label: string }[] = [];

    for (let hour = start; hour < end; hour += 1) {
      [0, 30].forEach(minute => {
        slots.push({
          hour,
          minute,
          label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        });
      });
    }

    return slots;
  }, [endHour, isAppointmentMode, startHour]);

  const isWorkingDay = !isAppointmentMode || schedulingBusinessDays.includes(dueDate.getDay());

  useEffect(() => {
    if (sheetRef.current) {
      setDueDate(selectedDate);
    }
  }, [selectedDate, sheetRef]);

  useEffect(() => {
    setOnlyAvailable(isAppointmentMode);
  }, [isAppointmentMode]);

  useEffect(() => {
    if (!isAppointmentMode) return;
    CatalogService.list('service')
      .then(setServices)
      .catch(() => setServices([]));
  }, [isAppointmentMode]);

  useEffect(() => {
    if (!isAppointmentMode || !assigneeId) return;
    if (availableAgents.some(agent => agent.id === assigneeId)) return;
    setAssigneeId(undefined);
  }, [assigneeId, availableAgents, isAppointmentMode]);

  useEffect(() => {
    if (!initialContact) return;
    setContact(initialContact);
    setContactQuery('');
    setContactResults([]);
  }, [initialContact, initialContactKey]);

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
        .filter(task => new Date(task.dueAt).toDateString() === dueDate.toDateString())
        .flatMap(task => {
          const busy: string[] = [];
          const date = new Date(task.dueAt);
          const endDate = new Date(date);
          endDate.setMinutes(endDate.getMinutes() + (task.durationMinutes || 30));
          for (let time = date.getTime(); time < endDate.getTime(); time += 30 * 60 * 1000) {
            const slotDate = new Date(time);
            busy.push(`${slotDate.getHours()}:${slotDate.getMinutes()}`);
          }
          return busy;
        }),
    );
  }, [assigneeId, dueDate, tasks]);

  const visibleSlots = !isWorkingDay
    ? []
    : onlyAvailable
      ? timeSlots.filter(slot => {
          const slotDate = new Date(dueDate);
          slotDate.setHours(slot.hour, slot.minute, 0, 0);
          const slotEnd = new Date(slotDate);
          slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

          for (let time = slotDate.getTime(); time < slotEnd.getTime(); time += 30 * 60 * 1000) {
            const current = new Date(time);
            if (busySlots.has(`${current.getHours()}:${current.getMinutes()}`)) return false;
          }

          return true;
        })
      : timeSlots;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssigneeId(undefined);
    setContact(null);
    setContactQuery('');
    setContactResults([]);
    setOnlyAvailable(isAppointmentMode);
    setSelectedServiceId(undefined);
  };

  const selectTime = (hour: number, minute: number) => {
    const nextDate = new Date(dueDate);
    nextDate.setHours(hour, minute, 0, 0);
    setDueDate(nextDate);
  };

  const handleSave = async () => {
    if (!title.trim() && !selectedService) return;
    await dispatch(
      taskActions.createTask({
        title: title.trim() || selectedService?.name || 'Agendamento',
        description: description.trim() || undefined,
        dueAt: dueDate.toISOString(),
        assigneeId,
        contactId: contact?.id,
        taskType: isAppointmentMode ? 'appointment' : 'task',
        catalogItemId: selectedService?.id,
        durationMinutes: isAppointmentMode ? durationMinutes : undefined,
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
          <BottomSheetHeader headerText={isAppointmentMode ? 'Novo agendamento' : 'Nova tarefa'} />
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tailwind.style('px-4 pt-5 pb-10')}>
            <Animated.Text
              style={tailwind.style('mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
              {isAppointmentMode ? 'Título do agendamento' : 'Título'}
            </Animated.Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={
                isAppointmentMode ? 'Ex: Corte, consulta, instalação' : 'O que precisa ser feito?'
              }
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

            {isAppointmentMode ? (
              <>
                <Animated.Text
                  style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
                  Serviço
                </Animated.Text>
                <Animated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tailwind.style('gap-2')}>
                  {services.map(service => (
                    <Pressable
                      key={service.id}
                      onPress={() => {
                        setSelectedServiceId(service.id);
                        if (!title.trim()) setTitle(service.name);
                      }}
                      style={tailwind.style(
                        'px-3 py-2 rounded-full border-[1px]',
                        selectedServiceId === service.id
                          ? 'border-blue-700 bg-blue-50'
                          : 'border-blackA-A3',
                      )}>
                      <Animated.Text
                        style={tailwind.style(
                          'text-sm',
                          selectedServiceId === service.id ? 'text-blue-700' : 'text-gray-700',
                        )}>
                        {service.name} · {service.durationMinutes || 30} min
                      </Animated.Text>
                    </Pressable>
                  ))}
                </Animated.ScrollView>
              </>
            ) : null}

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
              {availableAgents.map(agent => (
                <Pressable
                  key={agent.id}
                  onPress={() => setAssigneeId(agent.id)}
                  style={tailwind.style(
                    'px-3 py-2 rounded-full border-[1px]',
                    assigneeId === agent.id ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3',
                  )}>
                  <Animated.View style={tailwind.style('flex-row items-center gap-2')}>
                    <Avatar
                      size="xs"
                      src={agent.thumbnail ? { uri: agent.thumbnail } : undefined}
                      name={agent.name || ''}
                    />
                    <Animated.Text
                      style={tailwind.style(
                        'text-sm',
                        assigneeId === agent.id ? 'text-blue-700' : 'text-gray-700',
                      )}>
                      {agent.name}
                    </Animated.Text>
                  </Animated.View>
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
            {isAppointmentMode && !isWorkingDay ? (
              <Animated.Text style={tailwind.style('mt-2 text-sm text-gray-700')}>
                Dia fora do horário de atendimento.
              </Animated.Text>
            ) : null}
            {isAppointmentMode && isWorkingDay && visibleSlots.length === 0 ? (
              <Animated.Text style={tailwind.style('mt-2 text-sm text-gray-700')}>
                Nenhum horário disponível para esta data.
              </Animated.Text>
            ) : null}

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
                text={
                  isSaving
                    ? 'Salvando...'
                    : isAppointmentMode
                      ? 'Criar agendamento'
                      : 'Criar tarefa'
                }
                handlePress={handleSave}
                disabled={(!title.trim() && !selectedService) || isSaving}
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
