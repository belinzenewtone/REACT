import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

type BannerTone = 'error' | 'success' | 'info' | 'warning';

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

const SUCCESS = '#7BC47B';
const WARNING = '#F5CB5C';

export function TopBanner({ tone, message, visible, onDismiss, autoDismissMs }: TopBannerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const [mounted, setMounted] = useState(visible);

  const toneColor =
    tone === 'error'
      ? theme.colors.error
      : tone === 'success'
      ? SUCCESS
      : tone === 'warning'
      ? WARNING
      : theme.colors.primary;

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -10,
        duration: visible ? 220 : 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });

    if (visible && autoDismissMs && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, autoDismissMs, onDismiss, opacity, translateY]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.wrapper, { top: insets.top + spacing.xs, opacity, transform: [{ translateY }] }]}
    >
      <Animated.View
        style={[styles.banner, { backgroundColor: `${toneColor}20`, borderColor: toneColor }]}
      >
        <Ionicons name={ICONS[tone]} size={18} color={toneColor} />
        <Text variant="bodyMedium" style={[styles.message, { color: toneColor }]} numberOfLines={2}>
          {message}
        </Text>
        {onDismiss ? (
          <TouchableRipple onPress={onDismiss} borderless>
            <Ionicons name="close" size={16} color={toneColor} />
          </TouchableRipple>
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
  },
});
