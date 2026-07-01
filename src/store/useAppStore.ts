import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, UserProfile } from '../types';
import type { ThemeMode } from '../theme';
import { DEFAULT_CURRENCY, DEFAULT_DATE_FORMAT } from '../constants';
import { fileStorage } from '../storage/fileStorage';

interface AppState {
  // Onboarding / auth
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  setIsAuthenticated: (value: boolean) => void;

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
  biometricLock: false,
  lockTimeoutMinutes: 5,
  defaultTransactionCategory: 'uncategorized',
  fulizaLimit: 10000,
  hapticFeedback: true,
  screenLockEnabled: false,
  pinCode: '',
  fingerprintEnabled: false,
  faceUnlockEnabled: false,
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
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
        profile: state.profile,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hasHydrated: true });
      },
    }
  )
);
