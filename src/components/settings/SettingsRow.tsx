import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { LifeOSSwitch } from '../common/LifeOSSwitch';
import { spacing, typography, borderRadius } from '../../theme';

interface SettingsRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  destructive?: boolean;
  showChevron?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

export function SettingsRow({
  icon,
  iconColor,
  label,
  subtitle,
  value,
  onPress,
  toggle,
  toggleValue,
  onToggleChange,
  destructive,
  showChevron,
  disabled,
  isLast,
}: SettingsRowProps) {
  const colors = useThemeColors();

  const content = (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.left}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: (iconColor ?? colors.accentPrimary) + '20' },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={iconColor ?? colors.accentPrimary}
            />
          </View>
        )}
        <View style={styles.textCol}>
          <Text
            style={[
              styles.label,
              { color: destructive ? colors.danger : colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {value ? (
          <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {toggle ? (
          <LifeOSSwitch value={!!toggleValue} onValueChange={onToggleChange ?? (() => {})} disabled={disabled} />
        ) : showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        ) : null}
      </View>
    </View>
  );

  if (toggle) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={disabled}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    gap: spacing.base,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.base,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
