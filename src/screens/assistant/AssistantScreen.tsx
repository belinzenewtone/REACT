import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAssistantStore } from '../../store';
import { ChatMessage } from '../../components/assistant/ChatMessage';
import { ChatInput } from '../../components/assistant/ChatInput';
import { SuggestedPrompts } from '../../components/assistant/SuggestedPrompts';
import { spacing, typography } from '../../theme';

const SUGGESTED_PROMPTS = [
  'How much did I spend?',
  'What is my balance?',
  'Show my budgets',
  'What tasks are due?',
  'Recent transactions',
];

export function AssistantScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const listRef = useRef<FlatList>(null);

  const { messages, isLoading, loadMessages, sendMessage, clearConversation } = useAssistantStore();

  useEffect(() => {
    loadMessages(db);
  }, [db, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    await sendMessage(db, text);
  };

  const hasMessages = messages.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Assistant</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Offline • Rule-based</Text>
        </View>
        {hasMessages && (
          <TouchableOpacity onPress={() => clearConversation(db)}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {!hasMessages ? (
        <View style={styles.emptyState}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.accentPrimary}20` }]}>
            <Ionicons name="sparkles" size={32} color={colors.accentPrimary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Ask me anything
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            I can check your spending, income, budgets, tasks, and transactions.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage
              message={item}
              onActionPress={(action) => sendMessage(db, action)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <SuggestedPrompts
        prompts={SUGGESTED_PROMPTS}
        onPromptPress={(prompt) => handleSend(prompt)}
      />

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: typography.sizes.base * 1.5,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
});
