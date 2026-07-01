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
  notificationsEnabled: true,
  notificationTypes: {
    reminders: true,
    budgetAlerts: true,
    dailyDigest: true,
    recurringRules: true,
  },
  lockTimeoutMinutes: 5,
  defaultTransactionCategory: 'uncategorized',
  fulizaLimit: 10000,
  hapticFeedback: true,
  screenLockEnabled: false,
  pinCode: '',
  fingerprintEnabled: false,
  assistantQuickSuggestions: true,
  budgetThresholdAlerts: true,
  alertThresholds: { high: 90, medium: 75, low: 50 },
  dailyDigestMorningSummary: true,
  dailyDigestDeliveryTime: '06:30',
  appUpdates: true,
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
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
        profile: state.profile,
        onboardingStep: state.onboardingStep,
        onboardingGoal: state.onboardingGoal,
      }),
      onRehydrateStorage: () => (state) => {
        // Require the PIN immediately on cold start (before first render of app content)
        // if screen lock is on, so there's no flash of unlocked content.
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
