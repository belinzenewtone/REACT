import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../theme';

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
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, paddingBottom: spacing.sm + bottomInset }]}>
      <View style={[styles.inputRow, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Message BELTECH..."
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
            { backgroundColor: text.trim() ? colors.accentPrimary : colors.textTertiary },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          {disabled ? (
            <ActivityIndicator size={20} color={colors.textInverse} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: spacing.screenHorizontal,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});