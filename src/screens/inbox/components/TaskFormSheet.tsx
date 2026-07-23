import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Switch } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, BottomSheetBackdrop, BottomSheetHeader, Icon } from '@/components-next';
import { Button } from '@/components-next/button/Button';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { taskActions } from '@/store/task/taskActions';
import { selectTaskAgents, selectTasksSaving } from '@/store/task/taskSelectors';
import { TaskService } from '@/store/task/taskService';
import { CatalogService } from '@/store/catalog/catalogService';
import {
  selectSchedulingAgentIds,
  selectSchedulingBusinessDays,
  selectSchedulingEndHour,
  selectSchedulingStartHour,
} from '@/store/app-features/appFeaturesSelectors';
import type { Contact } from '@/types';
import type { CatalogItem } from '@/types/CatalogItem';
import type { ConversationTask } from '@/types/Task';
import { tailwind } from '@/theme';
import { TickIcon } from '@/svg-icons';

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

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const isSameDay = (firstDate: Date, secondDate: Date) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

export const TaskFormSheet = ({
  sheetRef,
  selectedDate,
  tasks,
  onSaved,
  initialContact,
  initialContactKey,
  isAppointmentMode = false,
}: TaskFormSheetProps) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const agents = useAppSelector(selectTaskAgents);
  const isSaving = useAppSelector(selectTasksSaving);
  const schedulingAgentIds = useAppSelector(selectSchedulingAgentIds);
  const schedulingBusinessDays = useAppSelector(selectSchedulingBusinessDays);
  const startHour = useAppSelector(selectSchedulingStartHour);
  const endHour = useAppSelector(selectSchedulingEndHour);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [visibleMonth, setVisibleMonth] = useState(selectedDate);
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

  const calendarWeeks = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: firstDay.getDay() }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: (Date | null)[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      weeks.push(cells.slice(index, index + 7));
    }

    return weeks;
  }, [visibleMonth]);

  useEffect(() => {
    if (sheetRef.current) {
      setDueDate(selectedDate);
      setVisibleMonth(selectedDate);
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

  const availableAgentCapacity = Math.max(availableAgents.length || agents.length, 1);

  const getOverlappingTasks = (date: Date) => {
    const slotEnd = new Date(date);
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

    return tasks
      .filter(task => task.status !== 'completed')
      .filter(task => new Date(task.dueAt).toDateString() === date.toDateString())
      .filter(task => {
        const taskStart = new Date(task.dueAt);
        const taskEnd = new Date(taskStart);
        taskEnd.setMinutes(taskEnd.getMinutes() + (task.durationMinutes || 30));
        return date.getTime() < taskEnd.getTime() && slotEnd.getTime() > taskStart.getTime();
      });
  };

  const getAvailableAgentCount = (date: Date) => {
    if (!isAppointmentMode || !isWorkingDay) return availableAgentCapacity;

    const overlaps = getOverlappingTasks(date);

    if (assigneeId) {
      const selectedAgentHasConflict = overlaps.some(task => task.assignee?.id === assigneeId);
      return !selectedAgentHasConflict && overlaps.length < availableAgentCapacity ? 1 : 0;
    }

    return Math.max(availableAgentCapacity - overlaps.length, 0);
  };

  const isTimeRangeAvailable = (date: Date) => {
    if (!isAppointmentMode || !onlyAvailable || !isWorkingDay) return true;
    return getAvailableAgentCount(date) > 0;
  };

  const visibleSlots = !isWorkingDay
    ? []
    : onlyAvailable
      ? timeSlots.filter(slot => {
          const slotDate = new Date(dueDate);
          slotDate.setHours(slot.hour, slot.minute, 0, 0);
          return isTimeRangeAvailable(slotDate);
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

  const selectDate = (date: Date) => {
    const nextDate = new Date(dueDate);
    nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDueDate(nextDate);
    setVisibleMonth(date);
  };

  const changeVisibleMonth = (direction: -1 | 1) => {
    const nextMonth = new Date(visibleMonth);
    nextMonth.setMonth(nextMonth.getMonth() + direction, 1);
    setVisibleMonth(nextMonth);
  };

  const handleSave = async () => {
    if (!title.trim() && !selectedService) return;
    if (!isTimeRangeAvailable(dueDate)) return;
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

  const isSubmitDisabled =
    (!title.trim() && !selectedService) || isSaving || !isTimeRangeAvailable(dueDate);
  const formTitle = isAppointmentMode ? 'Novo agendamento' : 'Nova tarefa';
  const renderContactSection = () => (
    <>
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
          <Animated.Text style={tailwind.style('text-sm text-blue-700')}>Remover</Animated.Text>
        </Pressable>
      ) : (
        <>
          <BottomSheetTextInput
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
              style={tailwind.style('flex-row items-center py-3 border-b-[1px] border-blackA-A3')}>
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
    </>
  );

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['88%']}
        topInset={insets.top + 8}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={BottomSheetBackdrop}
        onDismiss={resetForm}
        handleIndicatorStyle={tailwind.style('bg-blackA-A6 w-8 h-1 rounded-[11px]')}>
        {isAppointmentMode ? (
          <Animated.View style={tailwind.style('flex-row items-center justify-between px-4 pt-1')}>
            <Animated.View style={tailwind.style('w-10')} />
            <Animated.Text
              numberOfLines={1}
              style={tailwind.style(
                'flex-1 text-center text-gray-700 text-md font-inter-medium-24 leading-[17px] tracking-[0.32px]',
              )}>
              {formTitle}
            </Animated.Text>
            <Pressable
              onPress={handleSave}
              disabled={isSubmitDisabled}
              style={tailwind.style(
                'w-10 h-10 rounded-full items-center justify-center',
                isSubmitDisabled ? 'bg-gray-100' : 'bg-blue-700',
              )}>
              {isSaving ? (
                <ActivityIndicator color={tailwind.color('text-white')} />
              ) : (
                <Icon
                  icon={
                    <TickIcon
                      stroke={
                        isSubmitDisabled
                          ? tailwind.color('text-gray-500')
                          : tailwind.color('text-white')
                      }
                    />
                  }
                  size={22}
                />
              )}
            </Pressable>
          </Animated.View>
        ) : (
          <BottomSheetHeader headerText={formTitle} />
        )}
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tailwind.style('px-4 pt-5 pb-40')}>
          <Animated.Text
            style={tailwind.style('mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
            {isAppointmentMode ? 'Título do agendamento' : 'Título'}
          </Animated.Text>
          <BottomSheetTextInput
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
          <BottomSheetTextInput
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
                style={tailwind.style('text-sm', !assigneeId ? 'text-blue-700' : 'text-gray-700')}>
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

          {renderContactSection()}

          <Animated.View style={tailwind.style('mt-5 flex-row items-center justify-between')}>
            <Animated.Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-800')}>
              Data
            </Animated.Text>
            <Animated.Text style={tailwind.style('text-sm text-gray-600')}>
              {formatDate(dueDate)}
            </Animated.Text>
          </Animated.View>
          <Animated.View
            style={tailwind.style('mt-2 border-[1px] border-blackA-A3 rounded-xl p-3')}>
            <Animated.View style={tailwind.style('flex-row items-center justify-between mb-3')}>
              <Pressable
                onPress={() => changeVisibleMonth(-1)}
                style={tailwind.style('w-9 h-9 rounded-full items-center justify-center')}>
                <Animated.Text style={tailwind.style('text-2xl text-gray-700')}>
                  {'‹'}
                </Animated.Text>
              </Pressable>
              <Animated.Text
                numberOfLines={1}
                style={tailwind.style(
                  'flex-1 text-center text-sm font-inter-medium-24 text-gray-950 capitalize',
                )}>
                {formatMonth(visibleMonth)}
              </Animated.Text>
              <Pressable
                onPress={() => changeVisibleMonth(1)}
                style={tailwind.style('w-9 h-9 rounded-full items-center justify-center')}>
                <Animated.Text style={tailwind.style('text-2xl text-gray-700')}>
                  {'›'}
                </Animated.Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={tailwind.style('flex-row mb-1')}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Animated.Text
                  key={`${label}-${index}`}
                  style={tailwind.style('flex-1 text-center text-xs text-gray-500')}>
                  {label}
                </Animated.Text>
              ))}
            </Animated.View>
            {calendarWeeks.map((week, weekIndex) => (
              <Animated.View key={weekIndex} style={tailwind.style('flex-row')}>
                {week.map((date, dayIndex) => {
                  const selected = date ? isSameDay(date, dueDate) : false;
                  const disabled =
                    isAppointmentMode && date
                      ? !schedulingBusinessDays.includes(date.getDay())
                      : false;

                  return (
                    <Animated.View
                      key={`${weekIndex}-${dayIndex}`}
                      style={tailwind.style('flex-1 p-0.5')}>
                      {date ? (
                        <Pressable
                          onPress={() => selectDate(date)}
                          disabled={disabled}
                          style={tailwind.style(
                            'h-9 rounded-full items-center justify-center',
                            selected ? 'bg-blue-700' : 'bg-transparent',
                            disabled ? 'opacity-30' : 'opacity-100',
                          )}>
                          <Animated.Text
                            style={tailwind.style(
                              'text-sm',
                              selected ? 'text-white font-inter-medium-24' : 'text-gray-800',
                            )}>
                            {date.getDate()}
                          </Animated.Text>
                        </Pressable>
                      ) : (
                        <Animated.View style={tailwind.style('h-9')} />
                      )}
                    </Animated.View>
                  );
                })}
              </Animated.View>
            ))}
          </Animated.View>
          <Animated.Text
            style={tailwind.style('mt-5 mb-1.5 text-sm font-inter-medium-24 text-gray-800')}>
            Horário
          </Animated.Text>
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
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tailwind.style('mt-3 gap-2 pr-4')}>
            {visibleSlots.map(slot => {
              const isSelected =
                dueDate.getHours() === slot.hour && dueDate.getMinutes() === slot.minute;
              const slotDate = new Date(dueDate);
              slotDate.setHours(slot.hour, slot.minute, 0, 0);
              const availableCount = getAvailableAgentCount(slotDate);
              const shouldShowAvailability = isAppointmentMode && !assigneeId;

              return (
                <Pressable
                  key={slot.label}
                  onPress={() => selectTime(slot.hour, slot.minute)}
                  style={tailwind.style(
                    'w-[74px] py-2 rounded-md border-[1px] items-center',
                    isSelected ? 'border-blue-700 bg-blue-50' : 'border-blackA-A3',
                  )}>
                  <Animated.Text
                    style={tailwind.style(
                      'text-sm',
                      isSelected ? 'text-blue-700' : 'text-gray-700',
                    )}>
                    {slot.label}
                  </Animated.Text>
                  {shouldShowAvailability ? (
                    <Animated.Text
                      style={tailwind.style(
                        'mt-0.5 text-[10px]',
                        isSelected ? 'text-blue-700' : 'text-gray-500',
                      )}>
                      {availableCount} disp.
                    </Animated.Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Animated.ScrollView>
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

          {!isAppointmentMode ? (
            <Animated.View style={tailwind.style('mt-7')}>
              <Button
                text={isSaving ? 'Salvando...' : 'Criar tarefa'}
                handlePress={handleSave}
                disabled={isSubmitDisabled}
              />
              {isSaving ? <ActivityIndicator style={tailwind.style('mt-3')} /> : null}
            </Animated.View>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
};
