import React, { useEffect } from 'react';
import { ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendarStore } from '../../store';
import { CalendarMonthView } from '../../components/calendar/CalendarMonthView';
import { DayAgenda } from '../../components/calendar/DayAgenda';
import { spacing } from '../../theme';

export function CalendarScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const {
    isLoading,
    selectedDate,
    currentYear,
    currentMonth,
    eventsByDate,
    dayItems,
    setSelectedDate,
    goToPrevMonth,
    goToNextMonth,
    loadCalendar,
  } = useCalendarStore();

  useEffect(() => {
    loadCalendar(db);
  }, [db, currentYear, currentMonth, selectedDate, loadCalendar]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadCalendar(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        <CalendarMonthView
          year={currentYear}
          month={currentMonth}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
        />

        <DayAgenda
          selectedDate={selectedDate}
          items={dayItems}
          onAddEvent={() => navigation.navigate('EventForm')}
          onAddTask={() => navigation.navigate('TaskForm')}
          onItemPress={(item) =>
            item.type === 'task'
              ? navigation.navigate('TaskDetail', { taskId: item.id })
              : navigation.navigate('EventDetail', { eventId: item.id })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
});
