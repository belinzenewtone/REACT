import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an Animated.Value that fades from 0 → 1 once `isReady` is true.
 * Use as the `opacity` of the form's ScrollView/content wrapper so fields
 * don't flash empty for a frame before the edit data loads from the DB.
 *
 * For new records (isEditing = false) the fade-in fires immediately on mount.
 */
export function useFormFadeIn(isReady: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isReady) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [isReady, opacity]);

  return opacity;
}
