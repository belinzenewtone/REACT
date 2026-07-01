import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarMonthView({
  year,
  month,
  selectedDate,
  eventsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarMonthViewProps) {
  const colors = useThemeColors();

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

  return (
    <View style={[styles.container, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.arrowButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.arrowButton} activeOpacity={0.7}>
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

      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          const dayStr = toDateString(new Date(day.fullDate));
          const isSelected = dayStr === selectedDateStr;

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              style={[
                styles.dayCell,
                day.isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.accentPrimary },
                isSelected && { backgroundColor: colors.accentPrimary },
              ]}
              onPress={() => onSelectDate(day.fullDate)}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: day.isCurrentMonth ? colors.textPrimary : colors.textTertiary },
                  isSelected && { color: colors.textInverse },
                ]}
              >
                {day.date}
              </Text>
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
      </View>
    </View>
  );
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  arrowButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
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
    borderRadius: borderRadius.lg,
  },
  dayText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  indicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
