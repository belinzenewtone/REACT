import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SearchField } from '../common/SearchField';
import { spacing, borderRadius } from '../../theme';

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
  placeholder?: string;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  onFilterPress,
  hasActiveFilters,
  placeholder = 'Search transactions...',
}: SearchFilterBarProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <SearchField value={search} onChangeText={onSearchChange} placeholder={placeholder} />

      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: colors.glassWhite, borderColor: colors.border },
          hasActiveFilters && { borderColor: colors.accentPrimary },
        ]}
        onPress={onFilterPress}
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={hasActiveFilters ? colors.accentPrimary : colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
