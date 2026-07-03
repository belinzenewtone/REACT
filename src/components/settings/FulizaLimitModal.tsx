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
  ScrollView,
  Keyboard,
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
  // Show an empty field when no limit is set so the user doesn't have to
  // delete a leading zero before typing their real limit.
  const displayValue = (value: number) => (value > 0 ? value.toString() : '');
  const [value, setValue] = useState(displayValue(currentLimit));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(displayValue(currentLimit));
      setIsSubmitting(false);
    }
  }, [visible, currentLimit]);

  const handleSave = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    Keyboard.dismiss();
    const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
    onSave(Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    Keyboard.dismiss();
    onCancel();
  };

  // Header is rendered outside the ScrollView so tapping Save/Later is never
  // intercepted by scroll-view keyboard-dismiss logic.
  const body = (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={styles.headerHitSlop}>
          <Text style={[styles.headerAction, { color: colors.textSecondary }]}>Later</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Fuliza Credit Limit</Text>
        <TouchableOpacity onPress={handleSave} hitSlop={styles.headerHitSlop} disabled={isSubmitting}>
          <Text style={[styles.headerAction, { color: colors.accentPrimary, opacity: isSubmitting ? 0.5 : 1 }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
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
              returnKeyType="done"
              onSubmitEditing={handleSave}
              editable={!isSubmitting}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerAction: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerHitSlop: {
    top: 16,
    bottom: 16,
    left: 16,
    right: 16,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
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
