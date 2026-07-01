import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CATEGORY_COLORS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';

interface CategoryChipsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const colors = useThemeColors();
  const allCategories = ['all', ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {allCategories.map((category) => {
        const isSelected = selected === category;
        const categoryColor = CATEGORY_COLORS[category] ?? colors.accentPrimary;

        return (
          <TouchableOpacity
            key={category}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? categoryColor : colors.glassWhite,
                borderColor: isSelected ? categoryColor : colors.border,
              },
            ]}
            onPress={() => onSelect(category)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.textInverse : colors.textPrimary },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {category === 'all' ? 'All' : category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.base,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
});
