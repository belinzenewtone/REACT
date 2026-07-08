import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, IconButton, Button, TouchableRipple, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

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
  month: number;
  selectedDate: string;
  eventsByDate: Map<string, { hasEvent: boolean; hasTask: boolean }>;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday?: () => void;
  swipeEnabled?: boolean;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SWIPE_DISTANCE = 55;
const SWIPE_FLICK_DISTANCE = 28;
const SWIPE_FLICK_VELOCITY = 350;
const SUCCESS = '#7BC47B';

export function CalendarMonthView({
  year,
  month,
  selectedDate,
  eventsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  swipeEnabled = true,
}: CalendarMonthViewProps) {
  const theme = useTheme();
  const slide = useRef(new Animated.Value(0)).current;
  const [gridWidth, setGridWidth] = useState(0);
  const cellSize = gridWidth > 0 ? Math.floor(gridWidth / 7) : 0;

  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - gridWidth) > 0.5) setGridWidth(w);
  };

  const liveRef = useRef({ swipeEnabled, onPrevMonth, onNextMonth });
  liveRef.current = { swipeEnabled, onPrevMonth, onNextMonth };

  const runTransition = (action: () => void, direction: -1 | 0 | 1 = 0) => {
    action();
    if (direction === 0) return;
    slide.setValue(direction * 28);
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const swipeGesture = Gesture.Pan()
    .enabled(swipeEnabled)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      const dx = e.translationX;
      const adx = Math.abs(dx);
      if (adx <= Math.abs(e.translationY)) return;
      const deliberate =
        adx >= SWIPE_DISTANCE ||
        (adx >= SWIPE_FLICK_DISTANCE && Math.abs(e.velocityX) >= SWIPE_FLICK_VELOCITY);
      if (!deliberate) return;
      if (dx < 0) runTransition(liveRef.current.onNextMonth, -1);
      else runTransition(liveRef.current.onPrevMonth, 1);
    });

  const days = React.useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    let startOffset = firstDayOfMonth.getUTCDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const today = new Date();
    const todayStr = toDateString(today);

    const result: (CalendarDay | null)[] = [];

    for (let i = 0; i < startOffset; i++) result.push(null);

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

    while (result.length % 7 !== 0) result.push(null);

    return result;
  }, [year, month, eventsByDate]);

  const weeks = React.useMemo(() => {
    const rows: (CalendarDay | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [days]);

  const selectedDateStr = toDateString(new Date(selectedDate));
  const now = new Date();
  const isViewingCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  return (
    <Card mode="elevated" style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Card.Content>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />}
            size={22}
            onPress={() => runTransition(onPrevMonth)}
          />
          <View style={styles.headerCenter}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {MONTH_NAMES[month - 1]} {year}
            </Text>
            {!isViewingCurrentMonth && onGoToToday ? (
              <Button
                mode="text"
                compact
                onPress={() => runTransition(onGoToToday)}
                textColor={theme.colors.primary}
              >
                Today
              </Button>
            ) : null}
          </View>
          <IconButton
            icon={() => <Ionicons name="chevron-forward" size={22} color={theme.colors.onSurface} />}
            size={22}
            onPress={() => runTransition(onNextMonth)}
          />
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} variant="labelSmall" style={[styles.weekdayText, { color: theme.colors.onSurfaceVariant }]}>
              {day}
            </Text>
          ))}
        </View>

        <GestureDetector gesture={swipeGesture}>
          <Animated.View
            onLayout={onGridLayout}
            style={{ transform: [{ translateX: slide }] }}
          >
            {cellSize > 0 && weeks.map((week, wIndex) => (
              <View key={wIndex} style={[styles.weekRow, { height: cellSize }]}>
                {week.map((day, dIndex) => {
                  if (!day) {
                    return <View key={dIndex} style={styles.dayCell} />;
                  }
                  const isSelected = day.fullDate.split('T')[0] === selectedDateStr;
                  const circle = Math.min(cellSize - 6, 44);

                  return (
                    <TouchableRipple
                      key={dIndex}
                      style={styles.dayCell}
                      onPress={() => onSelectDate(day.fullDate)}
                    >
                      <View style={styles.dayCellInner}>
                        <View
                          style={[
                            styles.dayCircle,
                            { width: circle, height: circle },
                            day.isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.colors.primary },
                            isSelected && { backgroundColor: theme.colors.primary },
                          ]}
                        >
                          <Text
                            variant="bodyMedium"
                            style={[
                              { color: theme.colors.onSurface },
                              isSelected && { color: theme.colors.onPrimary, fontWeight: '600' },
                            ]}
                          >
                            {day.date}
                          </Text>
                        </View>
                        <View style={styles.indicators}>
                          {day.hasEvent && (
                            <View style={[styles.dot, { backgroundColor: isSelected ? theme.colors.onPrimary : theme.colors.primary }]} />
                          )}
                          {day.hasTask && (
                            <View style={[styles.dot, { backgroundColor: isSelected ? theme.colors.onPrimary : SUCCESS }]} />
                          )}
                        </View>
                      </View>
                    </TouchableRipple>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        </GestureDetector>
      </Card.Content>
    </Card>
  );
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: spacing.sm,
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
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    padding: 2,
    margin: 0,
    borderRadius: 0,
  },
  dayCellInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
