import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

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
  const theme = useTheme();
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

  const body = (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Button mode="text" onPress={handleCancel} disabled={isSubmitting} textColor={theme.colors.onSurfaceVariant}>
          Later
        </Button>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
          Fuliza Credit Limit
        </Text>
        <Button mode="text" onPress={handleSave} disabled={isSubmitting} loading={isSubmitting}>
          Save
        </Button>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        <View style={styles.content}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.xl }}>
            We detected Fuliza activity. Enter your personal Fuliza limit in KES to improve debt tracking accuracy.
          </Text>

          <TextInput
            mode="outlined"
            value={value}
            onChangeText={(text) => setValue(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!isSubmitting}
            left={<TextInput.Affix text="KSh " />}
            style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
          />
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
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  input: {
    fontSize: 28,
    fontWeight: '700',
  },
});
