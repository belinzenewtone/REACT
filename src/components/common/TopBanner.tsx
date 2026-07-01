import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

export type BannerTone = 'error' | 'success' | 'info' | 'warning';

interface TopBannerProps {
  tone: BannerTone;
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const ICONS: Record<BannerTone, keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle',
  success: 'checkmark-circle',
  info: 'information-circle',
  warning: 'warning',
};

export function TopBanner({ tone, message, visible, onDismiss, autoDismissMs }: TopBannerProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const toneColor = colors[tone === 'error' ? 'danger' : tone];

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (visible && autoDismissMs && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, autoDismissMs, onDismiss, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: insets.top + spacing.xs, opacity }]}
    >
      <Animated.View
        style={[styles.banner, { backgroundColor: `${toneColor}20`, borderColor: toneColor }]}
      >
        <Ionicons name={ICONS[tone]} size={18} color={toneColor} />
        <Text style={[styles.message, { color: toneColor }]} numberOfLines={2}>
          {message}
        </Text>
        {onDismiss ? (
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={16} color={toneColor} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.screenHorizontal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
