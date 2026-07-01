import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface TimePickerModalProps {
  visible: boolean;
  value: string; // HH:mm
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export function TimePickerModal({ visible, value, onConfirm, onCancel }: TimePickerModalProps) {
  const colors = useThemeColors();
  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(30);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (visible && value) {
      const [h, m] = value.split(':').map(Number);
      let displayHour = h;
      let displayPeriod: 'AM' | 'PM' = 'AM';
      if (displayHour >= 12) {
        displayPeriod = 'PM';
        displayHour = displayHour === 12 ? 12 : displayHour - 12;
      }
      if (displayHour === 0) displayHour = 12;
      setHour(displayHour);
      setMinute(m);
      setPeriod(displayPeriod);
    }
  }, [visible, value]);

  const adjust = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    current: number,
    delta: number,
    max: number
  ) => {
    let next = current + delta;
    if (next > max) next = 1;
    if (next < 1) next = max;
    setter(next);
  };

  const adjustMinute = (delta: number) => {
    let next = minute + delta;
    if (next >= 60) next = 0;
    if (next < 0) next = 55;
    setMinute(next);
  };

  const handleConfirm = () => {
    let displayHour = hour;
    if (period === 'PM' && hour !== 12) displayHour += 12;
    if (period === 'AM' && hour === 12) displayHour = 0;
    const formatted = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onConfirm(formatted);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView
        style={[styles.overlay, { backgroundColor: colors.glassBlack }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.action, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Delivery time</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={[styles.action, { color: colors.accentPrimary }]}>Set</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.picker}>
            <Wheel
              onIncrement={() => adjust(setHour, hour, 1, 12)}
              onDecrement={() => adjust(setHour, hour, -1, 12)}
              label={String(hour).padStart(2, '0')}
            />
            <Text style={[styles.colon, { color: colors.textPrimary }]}>:</Text>
            <Wheel
              onIncrement={() => adjustMinute(5)}
              onDecrement={() => adjustMinute(-5)}
              label={String(minute).padStart(2, '0')}
            />
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  period === 'AM' && { backgroundColor: colors.accentPrimary },
                ]}
                onPress={() => setPeriod('AM')}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: period === 'AM' ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  period === 'PM' && { backgroundColor: colors.accentPrimary },
                ]}
                onPress={() => setPeriod('PM')}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: period === 'PM' ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Wheel({
  label,
  onIncrement,
  onDecrement,
}: {
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.wheel}>
      <TouchableOpacity onPress={onIncrement}>
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>▲</Text>
      </TouchableOpacity>
      <Text style={[styles.wheelLabel, { color: colors.textPrimary }]}>{label}</Text>
      <TouchableOpacity onPress={onDecrement}>
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  action: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  wheel: {
    alignItems: 'center',
    gap: spacing.base,
  },
  arrow: {
    fontSize: typography.sizes.lg,
    paddingHorizontal: spacing.base,
  },
  wheelLabel: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    minWidth: 64,
    textAlign: 'center',
  },
  colon: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
  },
  periodContainer: {
    justifyContent: 'center',
    marginLeft: spacing.base,
    gap: spacing.sm,
  },
  periodButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  periodText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
