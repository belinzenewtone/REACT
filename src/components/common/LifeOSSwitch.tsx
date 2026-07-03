import React from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { haptic } from '../../utils/haptics';

interface LifeOSSwitchProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function LifeOSSwitch({ value, onValueChange, ...rest }: LifeOSSwitchProps) {
  const colors = useThemeColors();

  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        // Light pulse for every toggle change across the app; no-ops if
        // haptic feedback is disabled in Settings.
        haptic('light');
        onValueChange(v);
      }}
      trackColor={{ false: colors.border, true: colors.accentPrimary }}
      thumbColor={colors.textInverse}
      ios_backgroundColor={colors.border}
      {...rest}
    />
  );
}
