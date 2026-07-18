import { useEffect, useRef } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useDataVersion } from '../store/dataVersion';
import {
  useDashboardStore,
  useAnalyticsStore,
  useBudgetStore,
  usePlannerStore,
} from '../store';

/**
 * Global reactive sync for aggregate stores.
 *
 * Problem: dataVersion bumps happen after native SMS imports and after any
 * local mutation, but many screens only reload when they are *focused*. That
 * means a bulk SMS import on FinanceScreen updates the transaction list, yet
 * HomeScreen's dashboard cards (today/week/month) and BudgetsScreen stay stale
 * until the user navigates there.
 *
 * This hook watches dataVersion from the root of the app and eagerly reloads
 * every aggregate store so all surfaces reflect new data immediately. Stores
 * that are not currently mounted still update their Zustand state; screens
 * read the fresh values next time they render.
 */
export function useGlobalDataSync(db: SQLiteDatabase | null) {
  const transactionVersion = useDataVersion((s) => s.transactionVersion);
  const plannerVersion = useDataVersion((s) => s.plannerVersion);
  const lastTxVersion = useRef(-1);
  const lastPlannerVersion = useRef(-1);

  const loadDashboard = useDashboardStore((s) => s.loadDashboard);
  const loadAnalytics = useAnalyticsStore((s) => s.loadAnalytics);
  const loadBudgets = useBudgetStore((s) => s.loadBudgets);
  const loadPlanner = usePlannerStore((s) => s.loadAll);

  useEffect(() => {
    if (!db) return;
    if (transactionVersion === lastTxVersion.current) return;
    lastTxVersion.current = transactionVersion;

    Promise.allSettled([
      loadDashboard(db),
      loadAnalytics(db),
      loadBudgets(db),
    ]).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const storeNames = ['dashboard', 'analytics', 'budgets'];
          console.warn(`[useGlobalDataSync] ${storeNames[index]} refresh failed:`, result.reason);
        }
      });
    });
  }, [db, transactionVersion, loadDashboard, loadAnalytics, loadBudgets]);

  useEffect(() => {
    if (!db) return;
    if (plannerVersion === lastPlannerVersion.current) return;
    lastPlannerVersion.current = plannerVersion;

    loadPlanner(db).catch((e) => {
      console.warn('[useGlobalDataSync] planner refresh failed:', e);
    });
  }, [db, plannerVersion, loadPlanner]);
}
