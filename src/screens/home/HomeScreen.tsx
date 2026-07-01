import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAppStore } from '../../store';
import { MetricCard, HomeMenuCard, WeeklyResetCard } from '../../components/dashboard';
import { TopBanner } from '../../components/common/TopBanner';
import { ShimmerLoadingState } from '../../components/common/ShimmerLoadingState';
import { spacing, typography } from '../../theme';

export function HomeScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const profile = useAppStore((state) => state.profile);
  const {
    isLoading,
    hasLoadedOnce,
    error,
    expense,
    todaySpend,
    weekSpend,
    pendingTaskCount,
    nextEvent,
    loadDashboard,
  } = useDashboardStore();

  useEffect(() => {
    loadDashboard(db);
  }, [db, loadDashboard]);

  const greeting = getGreeting();
  const name = profile?.name?.split(' ')[0] ?? 'there';
  const todayLabel = format(new Date(), 'EEEE, MMM d');

  const navigateToTab = (tabName: string) => {
    navigation.navigate(tabName);
  };

  const navigateToStack = (screenName: string) => {
    navigation.getParent()?.navigate(screenName);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadDashboard(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Today</Text>
            <Text style={[styles.headerDate, { color: colors.textSecondary }]}>{todayLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.glassWhite }]}
            onPress={() => navigateToTab('Profile')}
          >
            <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.focusSection}>
          <Text style={[styles.focusLabel, { color: colors.accentPrimary }]}>Daily focus</Text>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {greeting}, {name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Review priorities, schedule, and your spend trend.
          </Text>
        </View>

        <TopBanner tone="error" message={error ?? ''} visible={!!error} />

        {!hasLoadedOnce && isLoading ? (
          <ShimmerLoadingState rows={3} rowHeight={88} />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricCard label="Today" amount={todaySpend} />
              <View style={styles.metricSpacer} />
              <MetricCard label="Week" amount={weekSpend} />
              <View style={styles.metricSpacer} />
              <MetricCard label="Month" amount={expense} />
            </View>

            <View style={styles.section}>
              <HomeMenuCard
                pendingTaskCount={pendingTaskCount}
                nextEvent={nextEvent}
                onTasksPress={() => navigateToTab('Calendar')}
                onNextEventPress={() => navigateToTab('Calendar')}
                onInsightsPress={() => navigateToStack('Insights')}
                onSearchPress={() => navigateToStack('Search')}
              />
            </View>

            <View style={styles.section}>
              <WeeklyResetCard
                pendingTaskCount={pendingTaskCount}
                onPress={() => navigateToTab('Calendar')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  headerDate: {
    fontSize: typography.sizes.base,
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusSection: {
    marginBottom: spacing.xl,
  },
  focusLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  greeting: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing.sm,
    lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  metricSpacer: {
    width: spacing.base,
  },
  section: {
    marginBottom: spacing.xl,
  },
});
