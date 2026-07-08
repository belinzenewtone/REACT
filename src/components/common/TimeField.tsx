import React, { useState } from 'react';
import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface TimeFieldProps {
  label: string;
  value: string; // 'HH:MM' 24h, or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  showIcon?: boolean;
}

function timeToDate(value: string): Date {
  const base = new Date();
  if (!value) return base;
  const [h, m] = value.split(':').map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base;
}

function formatDisplay(value: string): string {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function TimeField({ label, value, onChange, placeholder = 'Select time', style, showIcon = true }: TimeFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    const hh = String(selected.getHours()).padStart(2, '0');
    const mm = String(selected.getMinutes()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }, style]}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <TouchableRipple onPress={() => setOpen(true)} style={styles.valueRow} rippleColor={theme.colors.primary}>
        <View style={styles.valueRowInner}>
          <Text variant="bodyLarge" style={{ color: value ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
            {value ? formatDisplay(value) : placeholder}
          </Text>
          {showIcon && <Ionicons name="time-outline" size={18} color={theme.colors.onSurfaceVariant} />}
        </View>
      </TouchableRipple>

      {open && (
        <>
          <DateTimePicker
            value={timeToDate(value)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableRipple onPress={() => setOpen(false)} style={styles.doneButton}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>Done</Text>
            </TouchableRipple>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  valueRow: {
    paddingVertical: 4,
  },
  valueRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
});
