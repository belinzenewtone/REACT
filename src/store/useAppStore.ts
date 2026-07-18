import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, UserProfile } from '../types';
import type { ThemeMode } from '../theme';
import { DEFAULT_CURRENCY, DEFAULT_DATE_FORMAT } from '../constants';
import { fileStorage } from '../storage/fileStorage';

export type OnboardingGoal = 'productivity' | 'finance' | 'balanced';

interface AppState {
  // Onboarding / auth
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  setIsAuthenticated: (value: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  onboardingGoal: OnboardingGoal;
  setOnboardingGoal: (goal: OnboardingGoal) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setTheme: (theme: ThemeMode) => void;

  // Fired budget alerts (key: category|level|yearMonth) to prevent duplicate notifications
  firedBudgetAlerts: Record<string, string>;
  markBudgetAlertFired: (key: string) => void;
  clearFiredBudgetAlerts: (prefix?: string) => void;

  // Profile
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // UI
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  hasHydrated: boolean;

  // App lock (session-only, never persisted — always re-locks on cold start)
  isAppLocked: boolean;
  setIsAppLocked: (value: boolean) => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  currency: DEFAULT_CURRENCY,
  dateFormat: DEFAULT_DATE_FORMAT,
  timeFormat: '24h',
  decimalPrecision: 2,
  notificationsEnabled: false, // require explicit user opt-in via onboarding / settings
  notificationTypes: {
    reminders: true,
    budgetAlerts: true,
    dailyDigest: true,
    recurringRules: true,
    transactionAlerts: true,
  },
  lockTimeoutMinutes: 5,
  defaultTransactionCategory: 'uncategorized',
  fulizaLimit: 0,
  hapticFeedback: true,
  screenLockEnabled: false,
  pinCode: '',
  fingerprintEnabled: false,
  assistantQuickSuggestions: true,
  calendarSwipe: true,
  budgetThresholdAlerts: true,
  alertThresholds: { high: 90, medium: 75, low: 50 },
  dailyDigestMorningSummary: true,
  dailyDigestDeliveryTime: '06:30',
  appUpdates: true,
  smsBackgroundReceiver: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      setIsAuthenticated: (value) => set({ isAuthenticated: value }),
      onboardingStep: 1,
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      onboardingGoal: 'productivity',
      setOnboardingGoal: (goal) => set({ onboardingGoal: goal }),

      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
      setTheme: (theme) =>
        set((state) => ({ settings: { ...state.settings, theme } })),

      firedBudgetAlerts: {},
      markBudgetAlertFired: (key) =>
        set((state) => ({
          firedBudgetAlerts: { ...state.firedBudgetAlerts, [key]: new Date().toISOString() },
        })),
      clearFiredBudgetAlerts: (prefix) =>
        set((state) => {
          if (!prefix) return { firedBudgetAlerts: {} };
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(state.firedBudgetAlerts)) {
            if (!k.startsWith(prefix)) next[k] = v;
          }
          return { firedBudgetAlerts: next };
        }),

      profile: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),

      isLoading: true,
      setIsLoading: (value) => set({ isLoading: value }),
      hasHydrated: false,

      isAppLocked: false,
      setIsAppLocked: (value) => set({ isAppLocked: value }),
    }),
    {
      name: 'app-store',
      version: 1,
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
        profile: state.profile,
        onboardingStep: state.onboardingStep,
        onboardingGoal: state.onboardingGoal,
        firedBudgetAlerts: state.firedBudgetAlerts,
      }),
      migrate: (persistedState: any, version) => {
        // v0 -> v1: the old hardcoded Fuliza default (10000) was a sentinel for
        // "not configured". Reset it so the user is prompted for their real limit
        // when Fuliza activity is detected.
        if (version < 1 && persistedState?.settings?.fulizaLimit === 10000) {
          persistedState.settings.fulizaLimit = 0;
        }
        return persistedState as AppState;
      },
      onRehydrateStorage: () => (state) => {
        // Prune stale budget alert entries — keep only current and previous month.
        if (state?.firedBudgetAlerts) {
          const now = new Date();
          const ym = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const keep = new Set([ym(now), ym(prev)]);
          const pruned: Record<string, string> = {};
          for (const [k, v] of Object.entries(state.firedBudgetAlerts)) {
            const parts = k.split('|');
            const month = parts[2];
            if (month && keep.has(month)) pruned[k] = v;
          }
          state.firedBudgetAlerts = pruned;
        }

        const shouldLock = !!(
          state?.hasCompletedOnboarding &&
          state?.isAuthenticated &&
          state?.settings.screenLockEnabled &&
          state?.settings.pinCode
        );
        useAppStore.setState({ hasHydrated: true, isAppLocked: shouldLock });
      },
    }
  )
);
