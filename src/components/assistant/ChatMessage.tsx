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
          <Ionicons name="sparkles" size={16} color={colors.textInverse} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? colors.accentPrimary : colors.glassWhite,
            borderColor: isUser ? colors.accentPrimary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.content,
            {
              color: isUser ? colors.textInverse : colors.textPrimary,
              fontWeight: isUser ? typography.weights.semibold : typography.weights.regular,
            },
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
    maxWidth: '78%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 'auto',
  },
  bubble: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
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