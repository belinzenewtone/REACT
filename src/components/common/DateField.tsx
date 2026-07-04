import React, { useState } from 'react';
import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface DateFieldProps {
  label: string;
  value: string; // 'YYYY-MM-DD', or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: ViewStyle;
}

export function DateField({ label, value, onChange, placeholder = 'Select date', minimumDate, maximumDate, style }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const dateValue = value ? parseISO(value) : new Date();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(format(selected, 'yyyy-MM-dd'));
  };

  return (
    <View style={[styles.wrap, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }, style]}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <TouchableRipple onPress={() => setOpen(true)} style={styles.valueRow} rippleColor={theme.colors.primary}>
        <View style={styles.valueRowInner}>
          <Text variant="bodyLarge" style={{ color: value ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
            {value ? format(dateValue, 'MMM d, yyyy') : placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>

      {open && (
        <>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
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
