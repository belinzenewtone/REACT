import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDataVersion } from '../store/dataVersion';

/**
 * One tested implementation of the reload pattern currently duplicated across
 * Finance, Budgets, Import Health, Calendar, and friends:
 *
 *   - load once on mount
 *   - reload when the screen regains focus AND the global dataVersion advanced
 *   - reload live when dataVersion bumps while the screen is focused
 *     (e.g. a realtime SMS import writes rows mid-view)
 *
 * Usage:
 *   useLiveQuery(useCallback(() => { loadTransactions(repo, true); }, [repo]));
 *
 * The loader should be stable (useCallback) — it re-runs whenever its own
 * dependencies change, exactly like the hand-rolled versions did.
 */
export function useLiveQuery(loader: () => void | Promise<void>): void {
  const dataVersion = useDataVersion((s) => s.version);
  const loadedVersion = useRef(-1);

  // First mount — always populate.
  useEffect(() => {
    if (loadedVersion.current === -1) {
      loadedVersion.current = dataVersion;
      loader();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loader identity changed (its deps changed) — reload.
  useEffect(() => {
    if (loadedVersion.current !== -1) {
      loadedVersion.current = dataVersion;
      loader();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader]);

  // Realtime bump while focused.
  useEffect(() => {
    if (loadedVersion.current !== -1 && dataVersion !== loadedVersion.current) {
      loadedVersion.current = dataVersion;
      loader();
    }
  }, [dataVersion, loader]);

  // Regained focus with a newer dataVersion.
  useFocusEffect(
    useCallback(() => {
      if (dataVersion !== loadedVersion.current) {
        loadedVersion.current = dataVersion;
        loader();
      }
    }, [dataVersion, loader])
  );
}
