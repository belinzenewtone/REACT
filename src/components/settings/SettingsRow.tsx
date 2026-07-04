import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { LifeOSSwitch } from '../common/LifeOSSwitch';
import { spacing, borderRadius } from '../../theme';

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
  const theme = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomColor: theme.colors.outlineVariant, borderBottomWidth: 1 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.left}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor ?? theme.colors.primary}20` },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={iconColor ?? theme.colors.primary}
            />
          </View>
        )}
        <View style={styles.textCol}>
          <Text
            variant="bodyLarge"
            style={{ color: destructive ? theme.colors.error : theme.colors.onSurface }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {value ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {toggle ? (
          <LifeOSSwitch value={!!toggleValue} onValueChange={onToggleChange ?? (() => {})} disabled={disabled} />
        ) : showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.outline} />
        ) : null}
      </View>
    </View>
  );

  if (toggle) {
    return content;
  }

  return (
    <TouchableRipple onPress={onPress} disabled={disabled}>
      {content}
    </TouchableRipple>
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
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
