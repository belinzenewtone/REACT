import React from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface LifeOSSwitchProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function LifeOSSwitch({ value, onValueChange, ...rest }: LifeOSSwitchProps) {
  const colors = useThemeColors();

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.accentPrimary }}
      thumbColor={colors.textInverse}
      ios_backgroundColor={colors.border}
      {...rest}
    />
  );
}
