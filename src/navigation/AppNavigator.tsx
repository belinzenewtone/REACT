import React, { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors as themeColors } from '../theme';
import { useAppStore } from '../store';
import { useSQLiteContext } from 'expo-sqlite';
import type { Theme } from '@react-navigation/native';
import { migrateDatabaseAsync } from '../database';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { LoadingScreen } from '../screens/auth/LoadingScreen';
import { AppLockScreen } from '../screens/auth/AppLockScreen';
import { TransactionFormScreen } from '../screens/finance/TransactionFormScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { PersonalInformationScreen } from '../screens/profile/PersonalInformationScreen';
import { PlannerHubScreen } from '../screens/planner/PlannerHubScreen';
import { BudgetsScreen } from '../screens/planner/BudgetsScreen';
import { BudgetFormScreen } from '../screens/planner/BudgetFormScreen';
import { IncomeScreen } from '../screens/planner/IncomeScreen';
import { RecurringScreen } from '../screens/planner/RecurringScreen';
import { BillsScreen } from '../screens/planner/BillsScreen';
import { LoansScreen } from '../screens/planner/LoansScreen';
import { GoalsScreen } from '../screens/planner/GoalsScreen';
import { ExportScreen } from '../screens/planner/ExportScreen';
import { IncomeFormScreen } from '../screens/planner/IncomeFormScreen';
import { RecurringFormScreen } from '../screens/planner/RecurringFormScreen';
import { BillFormScreen } from '../screens/planner/BillFormScreen';
import { LoanFormScreen } from '../screens/planner/LoanFormScreen';
import { GoalFormScreen } from '../screens/planner/GoalFormScreen';
import { CsvImportScreen } from '../screens/planner/CsvImportScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { TransactionDetailScreen } from '../screens/finance/TransactionDetailScreen';
import { CategorizeScreen } from '../screens/finance/CategorizeScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { TaskFormScreen } from '../screens/tasks/TaskFormScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { EventsScreen } from '../screens/calendar/EventsScreen';
import { EventFormScreen } from '../screens/calendar/EventFormScreen';
import { EventDetailScreen } from '../screens/calendar/EventDetailScreen';
import { FeeAnalyticsScreen } from '../screens/finance/FeeAnalyticsScreen';
import { MerchantDetailScreen } from '../screens/finance/MerchantDetailScreen';
import { ReviewQueueScreen } from '../screens/settings/ReviewQueueScreen';
import { SmsImportHealthScreen } from '../screens/settings/SmsImportHealthScreen';
import { ChangelogScreen } from '../screens/settings/ChangelogScreen';
import { LearningScreen } from '../screens/learning/LearningScreen';
import { WeekReviewScreen } from '../screens/review/WeekReviewScreen';
import { ScreenLockScreen } from '../screens/settings/ScreenLockScreen';
import { NotificationsScreen } from '../screens/settings/NotificationsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Prevents Android from flashing a white background between screen transitions.
// Overrides the Navigation container background to match the app's dark surface.
const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: themeColors.bgPrimary,
    card: themeColors.bgSecondary,
    border: 'transparent',
    text: '#FFFFFF',
  },
};

export function AppNavigator() {
  const db = useSQLiteContext();
  const {
    hasCompletedOnboarding,
    isAuthenticated,
    isLoading,
    setIsLoading,
    hasHydrated,
    settings,
    isAppLocked,
    setIsAppLocked,
  } = useAppStore();
  const [dbReady, setDbReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const armedForLock = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        await migrateDatabaseAsync(db);
        if (mounted) setDbReady(true);
      } catch (error) {
        console.error('Database migration failed:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [db, setIsLoading]);

  // Cold start is handled synchronously during store rehydration (see useAppStore).
  // Here we only need to re-arm the lock when the app returns to the foreground after
  // being backgrounded — not on transient 'inactive' states (e.g. an iOS control-center
  // pull-down), only after a real background trip. PIN-only locks immediately; with
  // Fingerprint enabled, the configured auto-lock grace period applies instead.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const isLockable =
        hasCompletedOnboarding && isAuthenticated && settings.screenLockEnabled && !!settings.pinCode;

      if (nextState === 'background') {
        armedForLock.current = true;
        backgroundedAt.current = Date.now();
      } else if (nextState === 'active' && armedForLock.current) {
        armedForLock.current = false;
        if (isLockable) {
          const graceMs = settings.fingerprintEnabled ? settings.lockTimeoutMinutes * 60 * 1000 : 0;
          const elapsedMs = backgroundedAt.current ? Date.now() - backgroundedAt.current : Infinity;
          if (elapsedMs >= graceMs) setIsAppLocked(true);
        }
        backgroundedAt.current = null;
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [
    hasCompletedOnboarding,
    isAuthenticated,
    settings.screenLockEnabled,
    settings.pinCode,
    settings.fingerprintEnabled,
    settings.lockTimeoutMinutes,
    setIsAppLocked,
  ]);

  if (isLoading || !dbReady || !hasHydrated) {
    return <LoadingScreen />;
  }

  if (hasCompletedOnboarding && isAuthenticated && isAppLocked) {
    return <AppLockScreen />;
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 260,
          gestureEnabled: true,
          contentStyle: { backgroundColor: themeColors.bgPrimary },
        }}
      >
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="TransactionForm" component={TransactionFormScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
            <Stack.Screen name="Planner" component={PlannerHubScreen} />
            <Stack.Screen name="Budgets" component={BudgetsScreen} />
            <Stack.Screen name="BudgetForm" component={BudgetFormScreen} />
            <Stack.Screen name="Income" component={IncomeScreen} />
            <Stack.Screen name="IncomeForm" component={IncomeFormScreen} />
            <Stack.Screen name="Recurring" component={RecurringScreen} />
            <Stack.Screen name="RecurringForm" component={RecurringFormScreen} />
            <Stack.Screen name="Bills" component={BillsScreen} />
            <Stack.Screen name="BillForm" component={BillFormScreen} />
            <Stack.Screen name="Loans" component={LoansScreen} />
            <Stack.Screen name="LoanForm" component={LoanFormScreen} />
            <Stack.Screen name="Goals" component={GoalsScreen} />
            <Stack.Screen name="GoalForm" component={GoalFormScreen} />
            <Stack.Screen name="Export" component={ExportScreen} />
            <Stack.Screen name="CsvImport" component={CsvImportScreen} />
            <Stack.Screen name="Insights" component={AnalyticsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="Categorize" component={CategorizeScreen} />
            <Stack.Screen name="Tasks" component={TasksScreen} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <Stack.Screen name="TaskForm" component={TaskFormScreen} />
            <Stack.Screen name="Events" component={EventsScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="EventForm" component={EventFormScreen} />
            <Stack.Screen name="FeeAnalytics" component={FeeAnalyticsScreen} />
            <Stack.Screen name="MerchantDetail" component={MerchantDetailScreen} />
            <Stack.Screen name="ReviewQueue" component={ReviewQueueScreen} />
            <Stack.Screen name="SmsImportHealth" component={SmsImportHealthScreen} />
            <Stack.Screen name="Changelog" component={ChangelogScreen} />
            <Stack.Screen name="Learning" component={LearningScreen} />
            <Stack.Screen name="WeekReview" component={WeekReviewScreen} />
            <Stack.Screen name="ScreenLock" component={ScreenLockScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
