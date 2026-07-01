import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface SuggestedPromptsProps {
  prompts: string[];
  onPromptPress: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onPromptPress }: SuggestedPromptsProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {prompts.map((prompt, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.chip, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
          onPress={() => onPromptPress(prompt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={1}>
            {prompt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
