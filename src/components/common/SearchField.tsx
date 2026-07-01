import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: object;
}

export function SearchField({ value, onChangeText, placeholder = 'Search…', autoFocus, style }: SearchFieldProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.glassWhite, borderColor: colors.border }, style]}>
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 48,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.base,
  },
});
