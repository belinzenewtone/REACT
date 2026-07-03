import { Vibration, Platform } from 'react-native';
import { useAppStore } from '../store';

// Try to load expo-haptics if it's installed (it isn't by default). Falls
// back to React Native's built-in Vibration API so this file has zero deps.
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Fire a haptic pulse if the user has enabled haptic feedback in Settings.
 * Silently no-ops when disabled or when the platform doesn't support it.
 */
export function haptic(kind: HapticKind = 'light'): void {
  try {
    const enabled = useAppStore.getState().settings.hapticFeedback;
    if (!enabled) return;
  } catch {
    return;
  }

  if (Haptics) {
    try {
      switch (kind) {
        case 'light':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); return;
        case 'medium':  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); return;
        case 'heavy':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); return;
        case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); return;
        case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return;
        case 'error':   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return;
      }
    } catch {
      // fall through to Vibration
    }
  }

  // Fallback: RN's Vibration. iOS supports only a single default pulse, so
  // shape the pattern to differentiate kinds on Android where possible.
  if (Platform.OS === 'android') {
    switch (kind) {
      case 'light':   Vibration.vibrate(10); return;
      case 'medium':  Vibration.vibrate(20); return;
      case 'heavy':   Vibration.vibrate(40); return;
      case 'success': Vibration.vibrate([0, 15, 60, 15]); return;
      case 'warning': Vibration.vibrate([0, 30, 60, 30]); return;
      case 'error':   Vibration.vibrate([0, 40, 60, 40, 60, 40]); return;
    }
  } else {
    // iOS without expo-haptics: single short pulse.
    Vibration.vibrate();
  }
}
