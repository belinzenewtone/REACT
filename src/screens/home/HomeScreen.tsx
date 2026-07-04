import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Card,
  Text,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useDataVersion } from '../../store/dataVersion';
import { format } from 'date-fns';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAppStore } from '../../store';
import { HomeMenuCard, WeeklyResetCard } from '../../components/dashboard';
import { TopBanner } from '../../components/common/TopBanner';
import { ShimmerLoadingState } from '../../components/common/ShimmerLoadingState';
import { formatCurrency } from '../../utils/formatters';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

function HomeScreenContent() {
  const theme = useTheme();
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

  const dataVersion = useDataVersion((s) => s.version);
  const loadedVersion = useRef(-1);

  useFocusEffect(
    useCallback(() => {
      if (dataVersion > loadedVersion.current) {
        loadedVersion.current = dataVersion;
        loadDashboard(db);
      }
    }, [db, loadDashboard, dataVersion])
  );

  const greeting = getGreeting();
  const name = profile?.username ?? profile?.name?.split(' ')[0] ?? 'there';
  const todayLabel = format(new Date(), 'EEEE, MMM d');

  const navigateToTab = (tabName: string) => {
    navigation.navigate(tabName);
  };

  const navigateToStack = (screenName: string, params?: object) => {
    navigation.getParent()?.navigate(screenName, params);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="error" message={error ?? ''} visible={!!error} />
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              Today
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {todayLabel}
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="person-outline" size={22} color={theme.colors.onSurface} />}
            containerColor={theme.colors.surfaceVariant}
            onPress={() => navigateToTab('Profile')}
          />
        </View>

        <View style={styles.focusSection}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Daily focus
          </Text>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface }} numberOfLines={2}>
            {greeting}, {name}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Review priorities, schedule, and your spend trend.
          </Text>
        </View>

        {!hasLoadedOnce && isLoading ? (
          <ShimmerLoadingState rows={3} rowHeight={88} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsRow}>
              <MetricCard label="Today" amount={todaySpend} />
              <MetricCard label="Week" amount={weekSpend} />
              <MetricCard label="Month" amount={expense} />
            </ScrollView>

            <View style={styles.section}>
              <HomeMenuCard
                pendingTaskCount={pendingTaskCount}
                nextEvent={nextEvent}
                onTasksPress={() => navigateToStack('Tasks')}
                onNextEventPress={() => navigateToStack('Events')}
                onInsightsPress={() => navigateToStack('Insights')}
                onSearchPress={() => navigateToStack('Search')}
              />
            </View>

            <View style={styles.section}>
              <WeeklyResetCard
                pendingTaskCount={pendingTaskCount}
                onPress={() => navigateToStack('WeekReview')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function HomeScreen() {
  return <HomeScreenContent />;
}

function MetricCard({ label, amount }: { label: string; amount: number }) {
  const theme = useTheme();
  return (
    <Card style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
      <Card.Content>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, marginTop: spacing.sm }} numberOfLines={1}>
          {formatCurrency(amount, { decimals: 0 })}
        </Text>
      </Card.Content>
    </Card>
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
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
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
  focusSection: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingBottom: spacing.xl,
    paddingRight: spacing.lg,
    gap: spacing.base,
  },
  metricCard: {
    minWidth: 140,
    marginRight: spacing.base,
  },
  section: {
    marginBottom: spacing.xl,
  },
});
