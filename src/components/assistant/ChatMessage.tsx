import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Chip, useTheme } from 'react-native-paper';
import { formatDate } from '../../utils/formatters';
import { spacing, borderRadius } from '../../theme';

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

export const ChatMessage = React.memo(function ChatMessage({ message, onActionPress }: ChatMessageProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="sparkles" size={16} color={theme.colors.onPrimary} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? theme.colors.primary : theme.colors.surfaceVariant,
            borderColor: isUser ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        <Text
          variant="bodyMedium"
          style={{
            color: isUser ? theme.colors.onPrimary : theme.colors.onSurface,
            fontWeight: isUser ? '600' : '400',
          }}
        >
          {message.content}
        </Text>

        {message.actions && message.actions.length > 0 && (
          <View style={styles.actions}>
            {message.actions.map((action, index) => (
              <Chip
                key={index}
                onPress={() => onActionPress?.(action)}
                style={[
                  styles.actionChip,
                  {
                    backgroundColor: isUser ? `${theme.colors.onPrimary}20` : theme.colors.surface,
                  },
                ]}
                textStyle={{ color: isUser ? theme.colors.onPrimary : theme.colors.primary }}
              >
                {action}
              </Chip>
            ))}
          </View>
        )}

        <Text
          variant="bodySmall"
          style={[
            styles.timestamp,
            { color: isUser ? `${theme.colors.onPrimary}99` : theme.colors.onSurfaceVariant },
          ]}
        >
          {formatDate(message.createdAt, 'HH:mm')}
        </Text>
      </View>
    </View>
  );
});

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
    borderRadius: borderRadius.full,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  actionChip: {
    borderRadius: borderRadius.full,
  },
  timestamp: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
  },
});
