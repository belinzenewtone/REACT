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
import { MonthlyWrappedScreen } from '../screens/profile/MonthlyWrappedScreen';
import { ScreenLockScreen } from '../screens/settings/ScreenLockScreen';
import { NotificationsScreen } from '../screens/settings/NotificationsScreen';
import {
  reconcilePermissionState,
  syncDailyDigest,
  syncTaskReminders,
  syncEventReminders,
  syncRecurringReminders,
  syncBillReminders,
  syncAllNotifications,
} from '../services/notificationSyncService';
import { checkAllBudgetThresholds } from '../services/budgetAlertService';
import {
  fireNewTransactionAlert,
  addNotificationDeliveredListener,
  addNotificationTappedListener,
  type NotificationData,
} from '../services/notificationService';
import {
  addNewTransactionListener,
  addFulizaLimitNeededListener,
  enableBackgroundReceiver,
  setFulizaLimit,
  ensureIngestSweep,
} from '../../modules/lifeos-sms';
import { FulizaLimitModal } from '../components/settings/FulizaLimitModal';
import { useDataVersion } from '../store/dataVersion';
import { useGlobalDataSync } from '../hooks/useGlobalDataSync';
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
  useGlobalDataSync(dbReady ? db : null);
  const [fulizaModalVisible, setFulizaModalVisible] = useState(false);
  // Once the user has seen and acted on the Fuliza prompt in this session,
  // ignore further native events so a long-running import doesn't reopen it.
  const hasHandledFulizaPrompt = useRef(false);
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

  // Bootstrap notifications once the DB and persisted store are ready.
  // IMPORTANT: uses `reconcilePermissionState()` — a PASSIVE check that never
  // fires the OS permission dialog. The dialog is only shown when the user
  // taps "Allow" in the onboarding permission step or the Settings toggle.
  useEffect(() => {
    if (!dbReady || !hasHydrated) return;
    let cancelled = false;
    async function bootstrapNotifications() {
      try {
        // Reconcile persisted JS settings → native SharedPreferences on boot.
        // Handles fresh installs where JS defaults (e.g. fulizaLimit: 10000)
        // haven't yet been pushed to the native worker, and keeps state in
        // sync if the JS side changed while the process was killed.
        try {
          const s = useAppStore.getState().settings;
          await enableBackgroundReceiver(s.smsBackgroundReceiver ?? false);
          await setFulizaLimit(s.fulizaLimit ?? 0);
          // Register the 15-minute ingest-queue sweep and drain any SMS rows
          // that accumulated while the app was closed/killed.
          await ensureIngestSweep();
        } catch {}
        if (cancelled) return;
        await reconcilePermissionState();
        if (cancelled) return;
        // These sync fns are no-ops (or cancel) when permission is not granted.
        await syncDailyDigest();
        if (cancelled) return;
        await syncTaskReminders(db);
        if (cancelled) return;
        await syncEventReminders(db);
        if (cancelled) return;
        await syncRecurringReminders(db);
        if (cancelled) return;
        await syncBillReminders(db);
        if (cancelled) return;
        // Re-evaluate budget alerts on cold start in case spending crossed a
        // threshold while the app was closed.
        await checkAllBudgetThresholds(db);
      } catch (error) {
        console.warn('Notification bootstrap failed:', error);
      }
    }
    bootstrapNotifications();
    return () => {
      cancelled = true;
    };
  }, [db, dbReady, hasHydrated]);

  // Auto-reschedule the NEXT occurrence when a repeating notification fires
  // (delivered in foreground, or tapped from background/killed). Previously
  // recurring rules, bills, and repeating events (birthday/anniversary/
  // countdown/weekly…) fired once and went silent until the next app relaunch.
  useEffect(() => {
    if (!dbReady || !hasHydrated) return;
    const reschedule = (data: NotificationData) => {
      const run = async () => {
        switch (data?.type) {
          case 'recurring':
            await syncRecurringReminders(db, data.id);
            break;
          case 'bill':
            await syncBillReminders(db, data.id);
            break;
          case 'task':
            await syncTaskReminders(db, data.id);
            break;
          case 'event':
          case 'birthday':
          case 'anniversary':
          case 'countdown':
            await syncEventReminders(db, data.id);
            break;
          default:
            break; // daily_digest repeats natively; txn/budget are one-shots
        }
      };
      run().catch((e) => console.warn('Notification reschedule failed:', e));
    };
    const delivered = addNotificationDeliveredListener(reschedule);
    const tapped = addNotificationTappedListener(reschedule);
    return () => {
      delivered.remove();
      tapped.remove();
    };
  }, [db, dbReady, hasHydrated]);

  // Re-sync all reminders when the app returns to the foreground (throttled),
  // covering notifications that fired while the app was backgrounded — the
  // delivered-listener above only runs in the foreground.
  const lastForegroundSync = useRef(0);
  useEffect(() => {
    if (!dbReady || !hasHydrated) return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      // The background SmsProcessWorker writes to SQLite from its own native
      // connection while the app is backgrounded/killed — the onNewTransaction
      // event can be missed if JS was paused. Bump the data version on every
      // return to foreground so all subscribed screens (Finance, Import
      // Health, Dashboard…) re-read from disk immediately. Cheap: reads only.
      useDataVersion.getState().bumpTransactions();
      const now = Date.now();
      if (now - lastForegroundSync.current < 60_000) return;
      lastForegroundSync.current = now;
      syncAllNotifications(db).catch((e) =>
        console.warn('Foreground notification resync failed:', e)
      );
      checkAllBudgetThresholds(db).catch(() => {});
    });
    return () => sub.remove();
  }, [db, dbReady, hasHydrated]);

  // Listen for real-time SMS transactions and re-evaluate budget thresholds.
  useEffect(() => {
    if (!dbReady || !hasHydrated) return;
    const subscription = addNewTransactionListener((tx) => {
      // Native worker just wrote to SQLite from its own connection.
      // Bump so every subscribed store re-reads from disk.
      useDataVersion.getState().bumpTransactions();

      // Heads-up notification for the auto-imported transaction, gated by
      // the user's notification preferences. Skip Fuliza fee/charge notices —
      // they are service debits, not user-initiated transactions, and can fire
      // every midnight, which feels like "SMS everywhere".
      const s = useAppStore.getState().settings;
      if (
        s.notificationsEnabled &&
        s.notificationTypes?.transactionAlerts !== false &&
        tx?.mpesaCode &&
        tx.transactionType !== 'fuliza'
      ) {
        fireNewTransactionAlert(
          tx.mpesaCode,
          tx.amount,
          tx.merchant,
          tx.transactionType,
        ).catch(() => {});
      }

      checkAllBudgetThresholds(db).catch((error) => {
        console.warn('Budget check after SMS failed:', error);
      });
    });
    return () => subscription.remove();
  }, [db, dbReady, hasHydrated]);

  // The native worker emits onFulizaLimitNeeded when a Fuliza SMS is detected
  // but the user has never set their credit limit. This event previously had
  // NO listener — the FulizaLimitModal could only be reached via Settings.
  useEffect(() => {
    if (!dbReady || !hasHydrated) return;
    const sub = addFulizaLimitNeededListener(() => {
      if (hasHandledFulizaPrompt.current) return;
      const s = useAppStore.getState().settings;
      // Only prompt when the user hasn't configured a limit.
      if (!s.fulizaLimit || s.fulizaLimit <= 0) {
        setFulizaModalVisible(true);
      }
    });
    return () => sub.remove();
  }, [dbReady, hasHydrated]);

  const handleFulizaLimitSave = (limit: number) => {
    hasHandledFulizaPrompt.current = true;
    setFulizaModalVisible(false);
    // Native first — the background worker reads SharedPreferences, not JS state.
    setFulizaLimit(limit)
      .then(() => {
        useAppStore.setState((state) => ({ settings: { ...state.settings, fulizaLimit: limit } }));
      })
      .catch(() => {
        // Still persist in JS; bootstrap pushes JS → native on next launch.
        useAppStore.setState((state) => ({ settings: { ...state.settings, fulizaLimit: limit } }));
      });
  };

  const handleFulizaLimitCancel = () => {
    hasHandledFulizaPrompt.current = true;
    setFulizaModalVisible(false);
  };

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
    <>
    <FulizaLimitModal
      visible={fulizaModalVisible}
      currentLimit={settings.fulizaLimit ?? 0}
      onSave={handleFulizaLimitSave}
      onCancel={handleFulizaLimitCancel}
    />
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 100,
          gestureEnabled: true,
          contentStyle: { backgroundColor: themeColors.bgPrimary },
          navigationBarColor: themeColors.bgPrimary,
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
            <Stack.Screen name="MonthlyWrapped" component={MonthlyWrappedScreen} />
            <Stack.Screen name="ScreenLock" component={ScreenLockScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}
