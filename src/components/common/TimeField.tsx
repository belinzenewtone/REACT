import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface TimeFieldProps {
  label: string;
  value: string; // 'HH:MM' 24h, or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
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

export function TimeField({ label, value, onChange, placeholder = 'Select time', style }: TimeFieldProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    const hh = String(selected.getHours()).padStart(2, '0');
    const mm = String(selected.getMinutes()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.glassWhite }, style]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.valueRow} activeOpacity={0.7}>
        <Text style={[styles.value, { color: value ? colors.textPrimary : colors.textTertiary }]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <>
          <DateTimePicker
            value={timeToDate(value)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
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
