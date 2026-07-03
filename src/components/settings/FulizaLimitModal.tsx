import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface FulizaLimitModalProps {
  visible: boolean;
  currentLimit: number;
  onSave: (limit: number) => void;
  onCancel: () => void;
}

export function FulizaLimitModal({
  visible,
  currentLimit,
  onSave,
  onCancel,
}: FulizaLimitModalProps) {
  const colors = useThemeColors();
  const [value, setValue] = useState(currentLimit.toString());

  useEffect(() => {
    if (visible) {
      setValue(currentLimit.toString());
    }
  }, [visible, currentLimit]);

  const handleSave = () => {
    const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
    onSave(Number.isNaN(parsed) ? 0 : parsed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.bgPrimary }]}
          edges={['top', 'bottom']}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.headerAction, { color: colors.textSecondary }]}>Later</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Fuliza Credit Limit</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.headerAction, { color: colors.accentPrimary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We detected Fuliza activity. Enter your personal Fuliza limit in KES to improve debt tracking accuracy.
            </Text>

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.glassWhite, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.currency, { color: colors.textSecondary }]}>KSh</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={value}
                onChangeText={(text) => setValue(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                autoFocus
                selectionColor={colors.accentPrimary}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  headerAction: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  currency: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    marginRight: spacing.base,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
  },
});
