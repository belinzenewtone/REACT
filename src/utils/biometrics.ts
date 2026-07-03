import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricCheckResult =
  | { ok: true }
  | { ok: false; reason: 'no-hardware' | 'not-enrolled' | 'failed' | 'cancelled' };

/**
 * Prompts the OS fingerprint/biometric dialog. Returns why it failed so callers can show
 * the right message (no sensor vs. nothing enrolled vs. the scan itself failing).
 */
export async function promptBiometrics(promptMessage: string): Promise<BiometricCheckResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { ok: false, reason: 'no-hardware' };

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return { ok: false, reason: 'not-enrolled' };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  if (result.success) return { ok: true };
  return { ok: false, reason: result.error === 'user_cancel' ? 'cancelled' : 'failed' };
}
