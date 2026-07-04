import React from 'react';
import { type SwitchProps } from 'react-native';
import { Switch, useTheme } from 'react-native-paper';
import { haptic } from '../../services/haptics';

interface LifeOSSwitchProps extends Omit<SwitchProps, 'value' | 'onValueChange' | 'trackColor' | 'thumbColor'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function LifeOSSwitch({ value, onValueChange, ...rest }: LifeOSSwitchProps) {
  const theme = useTheme();

  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptic('light');
        onValueChange(v);
      }}
      color={theme.colors.primary}
      {...rest}
    />
  );
}
