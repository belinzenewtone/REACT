import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  bottomInset?: number;
}

export function ChatInput({ onSend, disabled, bottomInset = 0 }: ChatInputProps) {
  const colors = useThemeColors();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.inner, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Message LifeOS..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: text.trim() ? colors.accentPrimary : colors.bgTertiary },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          {disabled ? (
            <ActivityIndicator size={18} color={colors.textInverse} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={text.trim() ? colors.textInverse : colors.textTertiary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xs,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    maxHeight: 100,
    paddingVertical: spacing.sm,
    lineHeight: typography.sizes.base * 1.2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
});