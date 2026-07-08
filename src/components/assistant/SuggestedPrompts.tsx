import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

interface SuggestedPromptsProps {
  prompts: string[];
  onPromptPress: (prompt: string) => void;
}

export function SuggestedPrompts({ prompts, onPromptPress }: SuggestedPromptsProps) {
  const theme = useTheme();
  const visible = prompts.slice(0, 3);

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        Try asking:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {visible.map((prompt, index) => (
          <Chip
            key={index}
            onPress={() => onPromptPress(prompt)}
            style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}
            textStyle={{ color: theme.colors.primary }}
          >
            {prompt}
          </Chip>
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
  chipsRow: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
  },
});
