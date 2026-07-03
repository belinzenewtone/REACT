import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface CalendarDay {
  date: number;
  fullDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvent: boolean;
  hasTask: boolean;
}

interface CalendarMonthViewProps {
  year: number;
  month: number; // 1-12
  selectedDate: string;
  eventsByDate: Map<string, { hasEvent: boolean; hasTask: boolean }>;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday?: () => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SWIPE_THRESHOLD = 50;

export function CalendarMonthView({
  year,
  month,
  selectedDate,
  eventsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
}: CalendarMonthViewProps) {
  const colors = useThemeColors();
  const fade = useRef(new Animated.Value(1)).current;

  const runTransition = (action: () => void) => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0.3, duration: 90, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    action();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD) {
          runTransition(onNextMonth);
        } else if (gesture.dx >= SWIPE_THRESHOLD) {
          runTransition(onPrevMonth);
        }
      },
    })
  ).current;

  const days = React.useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // Adjust so Monday is the first day (0 = Monday, 6 = Sunday)
    let startOffset = firstDayOfMonth.getUTCDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const today = new Date();
    const todayStr = toDateString(today);

    const result: CalendarDay[] = [];

    // Previous month padding
    const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(Date.UTC(year, month - 2, d));
      result.push({
        date: d,
        fullDate: date.toISOString(),
        isCurrentMonth: false,
        isToday: false,
        hasEvent: false,
        hasTask: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const dateStr = toDateString(date);
      const indicators = eventsByDate.get(dateStr) ?? { hasEvent: false, hasTask: false };
      result.push({
        date: d,
        fullDate: date.toISOString(),
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasEvent: indicators.hasEvent,
        hasTask: indicators.hasTask,
      });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(Date.UTC(year, month, d));
      result.push({
        date: d,
        fullDate: date.toISOString(),
        isCurrentMonth: false,
        isToday: false,
        hasEvent: false,
        hasTask: false,
      });
    }

    return result;
  }, [year, month, eventsByDate]);

  const selectedDateStr = toDateString(new Date(selectedDate));
  const now = new Date();
  const isViewingCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => runTransition(onPrevMonth)} style={styles.arrowButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          {!isViewingCurrentMonth && onGoToToday ? (
            <TouchableOpacity
              onPress={() => runTransition(onGoToToday)}
              activeOpacity={0.7}
              style={[styles.todayButton, { backgroundColor: `${colors.accentPrimary}16` }]}
            >
              <Text style={[styles.todayLabel, { color: colors.accentPrimary }]}>Today</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => runTransition(onNextMonth)} style={styles.arrowButton} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[styles.weekdayText, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      <Animated.View style={[styles.daysGrid, { opacity: fade }]} {...panResponder.panHandlers}>
        {days.map((day, index) => {
          const dayStr = toDateString(new Date(day.fullDate));
          const isSelected = dayStr === selectedDateStr;

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              style={styles.dayCell}
              onPress={() => onSelectDate(day.fullDate)}
            >
              <View
                style={[
                  styles.dayCircle,
                  day.isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.accentPrimary },
                  isSelected && { backgroundColor: colors.accentPrimary },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: day.isCurrentMonth ? colors.textPrimary : colors.textTertiary },
                    isSelected && { color: colors.textInverse, fontWeight: typography.weights.bold },
                  ]}
                >
                  {day.date}
                </Text>
              </View>
              <View style={styles.indicators}>
                {day.hasEvent && (
                  <View style={[styles.dot, { backgroundColor: colors.accentSecondary }]} />
                )}
                {day.hasTask && (
                  <View style={[styles.dot, { backgroundColor: colors.success }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrowButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  todayButton: {
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  todayLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayCircle: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  indicators: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
