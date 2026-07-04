import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Button, SegmentedButtons, TextInput, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';

interface TimePickerModalProps {
  visible: boolean;
  value: string; // HH:mm
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export function TimePickerModal({ visible, value, onConfirm, onCancel }: TimePickerModalProps) {
  const theme = useTheme();
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

  const adjustHour = (delta: number) => {
    let next = hour + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setHour(next);
  };

  const adjustMinute = (delta: number) => {
    let next = minute + delta;
    if (next >= 60) next = 0;
    if (next < 0) next = 55;
    setMinute(next);
  };

  const handleHourChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    if (digits === '') return;
    let h = parseInt(digits, 10);
    if (h < 1) h = 1;
    if (h > 12) h = 12;
    setHour(h);
  };

  const handleMinuteChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    if (digits === '') return;
    let m = parseInt(digits, 10);
    if (m > 59) m = 59;
    setMinute(m);
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
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.header}>
            <Button mode="text" onPress={onCancel} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Delivery time</Text>
            <Button mode="text" onPress={handleConfirm} textColor={theme.colors.primary}>
              Set
            </Button>
          </View>

          <View style={styles.picker}>
            <View style={styles.wheel}>
              <IconButton
                icon={() => <Ionicons name="chevron-up" size={18} color={theme.colors.onSurfaceVariant} />}
                size={18}
                onPress={() => adjustHour(1)}
                style={{ margin: 0 }}
              />
              <TextInput
                mode="outlined"
                dense
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                textColor={theme.colors.onSurface}
                value={String(hour).padStart(2, '0')}
                onChangeText={handleHourChange}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <IconButton
                icon={() => <Ionicons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />}
                size={18}
                onPress={() => adjustHour(-1)}
                style={{ margin: 0 }}
              />
            </View>

            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>:</Text>

            <View style={styles.wheel}>
              <IconButton
                icon={() => <Ionicons name="chevron-up" size={18} color={theme.colors.onSurfaceVariant} />}
                size={18}
                onPress={() => adjustMinute(5)}
                style={{ margin: 0 }}
              />
              <TextInput
                mode="outlined"
                dense
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                textColor={theme.colors.onSurface}
                value={String(minute).padStart(2, '0')}
                onChangeText={handleMinuteChange}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <IconButton
                icon={() => <Ionicons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />}
                size={18}
                onPress={() => adjustMinute(-5)}
                style={{ margin: 0 }}
              />
            </View>

            <SegmentedButtons
              value={period}
              onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}
              density="small"
              buttons={[
                { value: 'AM', label: 'AM' },
                { value: 'PM', label: 'PM' },
              ]}
              style={{ marginLeft: spacing.base }}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.base,
  },
  wheel: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    gap: spacing.sm,
  },
  input: {
    width: 64,
    height: 48,
    textAlign: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
