import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
  createdAt: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onActionPress?: (action: string) => void;
}

export function ChatMessage({ message, onActionPress }: ChatMessageProps) {
  const colors = useThemeColors();
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.accentPrimary }]}>
          <Ionicons name="sparkles" size={14} color={colors.textInverse} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.accentPrimary : colors.glassWhite,
            borderColor: isUser ? colors.accentPrimary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.content,
            { color: isUser ? colors.textInverse : colors.textPrimary },
          ]}
        >
          {message.content}
        </Text>

        {message.actions && message.actions.length > 0 && (
          <View style={styles.actions}>
            {message.actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  { backgroundColor: isUser ? `${colors.textInverse}20` : colors.bgElevated },
                ]}
                onPress={() => onActionPress?.(action)}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: isUser ? colors.textInverse : colors.accentPrimary },
                  ]}
                >
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text
          style={[
            styles.timestamp,
            { color: isUser ? `${colors.textInverse}99` : colors.textTertiary },
          ]}
        >
          {formatDate(message.createdAt, 'HH:mm')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.base,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  bubble: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.base,
  },
  content: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  actionButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  timestamp: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
  },
});
