import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components-next';
import type { ConversationTask } from '@/types/Task';
import { TickIcon } from '@/svg-icons';
import { tailwind } from '@/theme';

const WEEK_DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const addDays = (date: Date, days: number) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

const isSameDay = (firstDate: Date, secondDate: Date) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

const timeLabel = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);

const taskTitle = (task: ConversationTask) =>
  task.title || task.contact?.name || task.conversation?.contactName || 'Tarefa';

type WeeklyPlannerProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onTaskPress: (task: ConversationTask) => void;
  tasks: ConversationTask[];
};

export const WeeklyPlanner = ({
  selectedDate,
  onSelectDate,
  onTaskPress,
  tasks,
}: WeeklyPlannerProps) => {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const dayWidth = Math.max((width - 40) / 3, 104);

  const days = useMemo(
    () =>
      Array.from({ length: 21 }, (_, index) => {
        const date = addDays(today, index - 10);
        const dayTasks = tasks
          .filter(task => isSameDay(new Date(task.dueAt), date))
          .sort(
            (first, second) => new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime(),
          );
        const groupedTasks = Object.values(
          dayTasks.reduce<Record<string, ConversationTask[]>>((groups, task) => {
            const label = timeLabel(new Date(task.dueAt));
            groups[label] = [...(groups[label] || []), task];
            return groups;
          }, {}),
        ).slice(0, 3);

        return {
          date,
          key: date.toISOString(),
          label: WEEK_DAY_LABELS[date.getDay()],
          dayNumber: date.getDate(),
          groupedTasks,
        };
      }),
    [tasks, today],
  );

  return (
    <Animated.View style={tailwind.style('bg-white pt-3 pb-2')}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={dayWidth + 8}
        decelerationRate="fast"
        onLayout={() => {
          scrollRef.current?.scrollTo({ x: (dayWidth + 8) * 9, animated: false });
        }}
        contentContainerStyle={tailwind.style('pl-4 pr-4 gap-2')}>
        {days.map(day => {
          const isSelected = isSameDay(day.date, selectedDate);
          return (
            <Pressable
              key={day.key}
              onPress={() => onSelectDate(day.date)}
              style={[
                tailwind.style(
                  'min-h-[116px] rounded-[8px] border-[1px] px-2 py-2',
                  isSelected ? 'border-gray-700 bg-gray-100' : 'border-blackA-A3 bg-white',
                ),
                { width: dayWidth },
              ]}>
              <View style={tailwind.style('flex-row items-center justify-between')}>
                <Animated.Text
                  style={tailwind.style(
                    'text-xs font-inter-medium-24',
                    isSelected ? 'text-gray-950' : 'text-gray-700',
                  )}>
                  {day.label}
                </Animated.Text>
                <Animated.Text
                  style={tailwind.style(
                    'text-base font-inter-semibold-24',
                    isSelected ? 'text-gray-950' : 'text-gray-800',
                  )}>
                  {day.dayNumber}
                </Animated.Text>
              </View>

              <View style={tailwind.style('mt-2 gap-1')}>
                {day.groupedTasks.map(group => {
                  const firstTask = group[0];
                  const groupTime = timeLabel(new Date(firstTask.dueAt));
                  const groupKey = `${day.key}-${groupTime}`;
                  const isExpanded = expandedGroupKey === groupKey;
                  const isGroupCompleted = group.every(task => task.status === 'completed');

                  return (
                    <View key={groupKey}>
                      <Pressable
                        onPress={() => {
                          if (group.length === 1) {
                            onTaskPress(firstTask);
                            return;
                          }
                          setExpandedGroupKey(isExpanded ? null : groupKey);
                        }}
                        style={tailwind.style(
                          'rounded-[6px] px-1.5 py-1',
                          isGroupCompleted ? 'bg-green-700' : 'bg-blue-800',
                        )}>
                        <View style={tailwind.style('flex-row items-start')}>
                          <View style={tailwind.style('flex-1 pr-1')}>
                            <Animated.Text
                              numberOfLines={1}
                              style={tailwind.style(
                                'text-[10px] font-inter-semibold-24 text-white',
                              )}>
                              {groupTime}
                            </Animated.Text>
                            <Animated.Text
                              numberOfLines={1}
                              style={tailwind.style('text-[10px] font-inter-normal-20 text-white')}>
                              {taskTitle(firstTask)}
                            </Animated.Text>
                          </View>
                          {group.length > 1 ? (
                            <View style={tailwind.style('rounded-full bg-white px-1.5 py-0.5')}>
                              <Animated.Text
                                style={tailwind.style(
                                  'text-[10px] font-inter-semibold-24 text-blue-800',
                                )}>
                                +{group.length - 1}
                              </Animated.Text>
                            </View>
                          ) : null}
                          {group.length === 1 && firstTask.status === 'completed' ? (
                            <Icon
                              icon={<TickIcon stroke={tailwind.color('text-white')} />}
                              size={12}
                            />
                          ) : null}
                        </View>
                      </Pressable>

                      {isExpanded ? (
                        <View style={tailwind.style('mt-1 gap-1')}>
                          {group.map(task => (
                            <Pressable
                              key={task.id}
                              onPress={() => onTaskPress(task)}
                              style={tailwind.style(
                                'rounded-[6px] px-1.5 py-1',
                                task.status === 'completed' ? 'bg-green-700' : 'bg-blue-800',
                              )}>
                              <View style={tailwind.style('flex-row items-center')}>
                                <Animated.Text
                                  numberOfLines={1}
                                  style={tailwind.style(
                                    'flex-1 text-[10px] font-inter-normal-20 text-white',
                                  )}>
                                  {taskTitle(task)}
                                </Animated.Text>
                                {task.status === 'completed' ? (
                                  <Icon
                                    icon={<TickIcon stroke={tailwind.color('text-white')} />}
                                    size={12}
                                  />
                                ) : null}
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};
