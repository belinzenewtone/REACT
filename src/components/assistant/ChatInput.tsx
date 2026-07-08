import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  bottomInset?: number;
}

export function ChatInput({ onSend, disabled, bottomInset = 0 }: ChatInputProps) {
  const theme = useTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.inner, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
        <TextInput
          mode="outlined"
          dense
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, textAlign: 'center', textAlignVertical: 'center' }]}
          placeholder="Message LifeOS..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          editable={!disabled}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          outlineColor="transparent"
          activeOutlineColor="transparent"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceVariant },
          ]}
          activeOpacity={0.8}
        >
          {disabled ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
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
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: 0,
    marginVertical: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
});
