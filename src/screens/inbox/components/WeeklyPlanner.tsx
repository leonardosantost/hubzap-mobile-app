import React, { useMemo } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { tailwind } from '@/theme';

const WEEK_DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_LABELS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

type PlannerDay = {
  key: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
};

const getStartOfWeek = (date: Date) => {
  const startOfWeek = new Date(date);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek;
};

const addDays = (date: Date, days: number) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

const isSameDay = (firstDate: Date, secondDate: Date) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

const buildWeek = (weekStartDate: Date, today: Date): PlannerDay[] =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStartDate, index);

    return {
      key: date.toISOString(),
      label: WEEK_DAY_LABELS[date.getDay()],
      dayNumber: date.getDate(),
      isToday: isSameDay(date, today),
    };
  });

type WeeklyPlannerProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export const WeeklyPlanner = ({ selectedDate, onSelectDate }: WeeklyPlannerProps) => {
  const { width } = useWindowDimensions();
  const pageWidth = Math.max(width - 40, 300);
  const today = useMemo(() => new Date(), []);

  const weeks = useMemo(() => {
    const currentWeekStart = getStartOfWeek(today);

    return [-1, 0, 1, 2].map(weekOffset => {
      const weekStart = addDays(currentWeekStart, weekOffset * 7);
      const weekEnd = addDays(weekStart, 6);

      return {
        key: weekStart.toISOString(),
        title: `${weekStart.getDate()} ${MONTH_LABELS[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()]}`,
        days: buildWeek(weekStart, today),
      };
    });
  }, [today]);

  return (
    <Animated.View style={tailwind.style('bg-white pt-4 pb-3')}>
      <Animated.ScrollView
        horizontal
        decelerationRate="fast"
        snapToInterval={pageWidth + 12}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tailwind.style('pl-4 pr-7 gap-3')}>
        {weeks.map(week => (
          <Animated.View
            key={week.key}
            style={[
              tailwind.style('rounded-lg border-[1px] border-blackA-A3 bg-gray-50 px-3 py-3'),
              { width: pageWidth },
            ]}>
            <Animated.Text
              style={tailwind.style(
                'text-sm font-inter-medium-24 leading-[17px] tracking-[0.24px] text-gray-950',
              )}>
              {week.title}
            </Animated.Text>
            <Animated.View style={tailwind.style('mt-3 flex flex-row gap-1.5')}>
              {week.days.map(day => {
                const date = new Date(day.key);
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <Pressable
                    key={day.key}
                    onPress={() => onSelectDate(date)}
                    style={tailwind.style('flex-1')}>
                    <Animated.View
                      style={tailwind.style(
                        'h-[62px] items-center justify-center rounded-lg border-[1px]',
                        isSelected ? 'border-blue-600 bg-blue-50' : 'border-blackA-A3 bg-white',
                      )}>
                      <Animated.Text
                        style={tailwind.style(
                          'text-xs font-inter-420-20 leading-[14px]',
                          isSelected ? 'text-blue-700' : 'text-gray-700',
                        )}>
                        {day.label}
                      </Animated.Text>
                      <Animated.Text
                        style={tailwind.style(
                          'pt-1 text-base font-inter-medium-24 leading-[20px]',
                          isSelected ? 'text-blue-700' : 'text-gray-950',
                        )}>
                        {day.dayNumber}
                      </Animated.Text>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </Animated.View>
        ))}
      </Animated.ScrollView>
    </Animated.View>
  );
};
