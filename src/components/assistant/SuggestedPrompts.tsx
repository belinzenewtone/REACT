import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface SuggestedPromptsProps {
  prompts: string[];
  onPromptPress: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onPromptPress }: SuggestedPromptsProps) {
  const colors = useThemeColors();
  const visible = prompts.slice(0, 3);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Try asking:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {visible.map((prompt, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.chip, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}
            onPress={() => onPromptPress(prompt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.text, { color: colors.accentPrimary }]} numberOfLines={1}>
              {prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.screenHorizontal,
  },
  label: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
});