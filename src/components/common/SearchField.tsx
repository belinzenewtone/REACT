import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: object;
}

export function SearchField({ value, onChangeText, placeholder = 'Search…', autoFocus, style }: SearchFieldProps) {
  const theme = useTheme();

  return (
    <Searchbar
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={value}
      autoFocus={autoFocus}
      style={[
        styles.searchbar,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
        style,
      ]}
      inputStyle={{ color: theme.colors.onSurface, minHeight: 40 }}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      iconColor={theme.colors.onSurfaceVariant}
      clearIcon="close-circle"
      clearButtonMode="while-editing"
    />
  );
}

const styles = StyleSheet.create({
  searchbar: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 44,
    minHeight: 44,
    elevation: 0,
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.base,
  },
});
