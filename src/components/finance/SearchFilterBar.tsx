import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SearchField } from '../common/SearchField';
import { borderRadius } from '../../theme';

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search transactions...',
}: SearchFilterBarProps) {
  return (
    <View style={styles.container}>
      <SearchField value={search} onChangeText={onSearchChange} placeholder={placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
});