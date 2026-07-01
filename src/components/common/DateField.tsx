import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

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
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const dateValue = value ? parseISO(value) : new Date();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(format(selected, 'yyyy-MM-dd'));
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.glassWhite }, style]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.valueRow} activeOpacity={0.7}>
        <Text style={[styles.value, { color: value ? colors.textPrimary : colors.textTertiary }]}>
          {value ? format(dateValue, 'MMM d, yyyy') : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

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
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.doneButton}>
              <Text style={[styles.doneText, { color: colors.accentPrimary }]}>Done</Text>
            </TouchableOpacity>
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
  label: {
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  value: {
    fontSize: typography.sizes.base,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  doneText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
