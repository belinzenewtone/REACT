import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { useAssistantStore, useAppStore } from '../../store';
import { ChatMessage, type ChatMessageData } from '../../components/assistant/ChatMessage';
import { ChatInput } from '../../components/assistant/ChatInput';
import { SuggestedPrompts } from '../../components/assistant/SuggestedPrompts';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

const SUGGESTED_PROMPTS = [
  'How much did I spend this week?',
  'What is my balance?',
  'Show my budgets',
  'What tasks are due today?',
  'Recent transactions',
  'Summarize my spending',
];

const FLOATING_TAB_BAR_HEIGHT = 58;
const TAB_BAR_HAIRLINE_GAP = 2;

function TypingIndicator() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.typingRow,
        { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={[styles.typingDot, { backgroundColor: theme.colors.onSurfaceVariant }]} />
      <View style={[styles.typingDot, { backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.6 }]} />
      <View style={[styles.typingDot, { backgroundColor: theme.colors.onSurfaceVariant, opacity: 0.3 }]} />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Thinking…
      </Text>
    </View>
  );
}

export function AssistantScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<ChatMessageData>>(null);
  const { messages, isLoading, loadMessages, sendMessage, clearConversation } = useAssistantStore();
  const quickSuggestionsEnabled = useAppStore((s) => s.settings.assistantQuickSuggestions);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const handleClearConfirm = () => {
    Alert.alert(
      'Clear chat history?',
      'This will remove your current assistant conversation and start a fresh one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearConversation(db),
        },
      ]
    );
  };

  const hasMessages = messages.length > 0;
  const showSuggestions = messages.length <= 1;

  const tabBarSafeInset =
    Math.max(insets.bottom, spacing.sm) + spacing.sm + FLOATING_TAB_BAR_HEIGHT + TAB_BAR_HAIRLINE_GAP;

  // Small safety fudge so the input never sits slightly under the keyboard
  // on devices whose reported keyboard height excludes the bottom gesture bar.
  const isKeyboardOpen = keyboardHeight > 0;
  const inputBottomInset = isKeyboardOpen
    ? keyboardHeight + spacing.base + 8
    : tabBarSafeInset;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Assistant
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: isLoading ? theme.colors.primary : theme.colors.onSurfaceVariant }}
            >
              {isLoading ? 'Thinking…' : 'Offline · Rule-based'}
            </Text>
          </View>
          {hasMessages && (
            <IconButton
              icon={() => <Ionicons name="trash-outline" size={22} color={theme.colors.error} />}
              onPress={handleClearConfirm}
            />
          )}
        </View>

        <View style={styles.messagesArea}>
          {!hasMessages ? (
            <View style={styles.emptyState}>
              <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="sparkles" size={36} color={theme.colors.primary} />
              </View>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                Ask me anything
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
              >
                I can check your spending, income, budgets, tasks, and transactions.
              </Text>
            </View>
          ) : (
            <FlashList
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
              ListFooterComponent={isLoading ? <TypingIndicator /> : null}
            />
          )}
        </View>

        {showSuggestions && quickSuggestionsEnabled && (
          <SuggestedPrompts
            prompts={SUGGESTED_PROMPTS}
            onPromptPress={(prompt) => handleSend(prompt)}
          />
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          bottomInset={inputBottomInset}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  messagesArea: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.base,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginTop: spacing.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
