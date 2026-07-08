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
import { FrostCard } from '../../components/common/FrostCard';
import { LinearGradient } from 'expo-linear-gradient';

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
      {/* Ambient aurora glow behind the header/greeting */}
      <View pointerEvents="none" style={styles.aurora}>
        <LinearGradient
          colors={theme.dark
            ? ['rgba(18,48,74,0.55)', 'rgba(14,27,46,0.25)', 'rgba(10,10,11,0)']
            : ['rgba(186,230,253,0.30)', 'rgba(224,242,254,0.12)', 'rgba(248,250,252,0)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.auroraRing, { top: -140, right: -90, width: 340, height: 340, backgroundColor: theme.dark ? 'rgba(87,185,255,0.08)' : 'rgba(3,105,161,0.05)' }]} />
        <View style={[styles.auroraRing, { top: -100, right: -50, width: 250, height: 250, backgroundColor: theme.dark ? 'rgba(87,185,255,0.09)' : 'rgba(3,105,161,0.06)' }]} />
        <View style={[styles.auroraRing, { top: 60, left: -120, width: 280, height: 280, backgroundColor: theme.dark ? 'rgba(94,234,212,0.05)' : 'rgba(15,118,110,0.04)' }]} />
      </View>
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
              <MetricCard label="Today" amount={todaySpend} glow="blue" />
              <MetricCard label="Week" amount={weekSpend} glow="teal" />
              <MetricCard label="Month" amount={expense} glow="blue" />
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

function MetricCard({ label, amount, glow }: { label: string; amount: number; glow?: 'blue' | 'teal' | 'none' }) {
  const theme = useTheme();
  return (
    <FrostCard style={styles.metricCard} glow={glow ?? 'blue'}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, marginTop: spacing.sm }} numberOfLines={1}>
        {formatCurrency(amount, { decimals: 0 })}
      </Text>
    </FrostCard>
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
  aurora: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    overflow: 'hidden',
  },
  auroraRing: {
    position: 'absolute',
    borderRadius: 999,
  },
});
