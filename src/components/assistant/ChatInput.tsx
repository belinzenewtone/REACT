import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const colors = useThemeColors();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderTopColor: colors.border }]}>
      <TouchableOpacity style={styles.iconButton}>
        <Ionicons name="mic-outline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={[styles.inputContainer, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Ask me anything..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          editable={!disabled}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          { backgroundColor: text.trim() ? colors.accentPrimary : colors.textTertiary },
        ]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Ionicons name="arrow-up" size={20} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    maxHeight: 100,
  },
  input: {
    fontSize: typography.sizes.base,
    paddingVertical: spacing.base,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
