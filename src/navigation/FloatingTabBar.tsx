import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, borderRadius, typography, motion } from '../theme';

const LABELS: Record<string, string> = {
  Home: 'Home',
  Finance: 'Finance',
  Calendar: 'Calendar',
  Assistant: 'AI',
  Profile: 'Profile',
};

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Finance: { active: 'wallet', inactive: 'wallet-outline' },
  Calendar: { active: 'calendar', inactive: 'calendar-outline' },
  Assistant: { active: 'sparkles', inactive: 'sparkles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
          bottom: Math.max(insets.bottom, spacing.sm) + spacing.sm,
        },
      ]}
      pointerEvents="box-none"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = LABELS[route.name] ?? route.name;
        const icons = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabButton
            key={route.key}
            isFocused={isFocused}
            label={label}
            icons={icons}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            colors={colors}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  isFocused,
  label,
  icons,
  accessibilityLabel,
  colors,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  label: string;
  icons: { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap };
  accessibilityLabel?: string;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useRef(new Animated.Value(isFocused ? 1 : 0.9)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1 : 0.9,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
    Animated.timing(pillOpacity, {
      toValue: isFocused ? 1 : 0,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scale, pillOpacity]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isFocused ? icons.active : icons.inactive}
          size={24}
          color={isFocused ? colors.accentPrimary : colors.textTertiary}
        />
      </Animated.View>
      <View style={styles.labelPill}>
        <Animated.View
          style={[styles.labelPillFill, { backgroundColor: colors.glassWhiteStrong, opacity: pillOpacity }]}
        />
        <Text
          style={[
            styles.label,
            { color: isFocused ? colors.accentPrimary : colors.textTertiary },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    height: 58,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  } as ViewStyle,
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  labelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  labelPillFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.xs + 1,
  },
});
