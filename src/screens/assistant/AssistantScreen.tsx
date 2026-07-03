import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAssistantStore, useAppStore } from '../../store';
import { ChatMessage } from '../../components/assistant/ChatMessage';
import { ChatInput } from '../../components/assistant/ChatInput';
import { SuggestedPrompts } from '../../components/assistant/SuggestedPrompts';
import { spacing, typography, borderRadius } from '../../theme';

const SUGGESTED_PROMPTS = [
  'How much did I spend this week?',
  'What is my balance?',
  'Show my budgets',
  'What tasks are due today?',
  'Recent transactions',
  'Summarize my spending',
];

function TypingIndicator({ colors }: { colors: any }) {
  return (
    <View style={[styles.typingRow, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
      <View style={[styles.typingDot, { backgroundColor: colors.textTertiary }]} />
      <View style={[styles.typingDot, { backgroundColor: colors.textTertiary, opacity: 0.6 }]} />
      <View style={[styles.typingDot, { backgroundColor: colors.textTertiary, opacity: 0.3 }]} />
      <Text style={[styles.typingText, { color: colors.textSecondary }]}>Thinking…</Text>
    </View>
  );
}

const FLOATING_TAB_BAR_HEIGHT = 58;
const TAB_BAR_HAIRLINE_GAP = 2;

export function AssistantScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { messages, isLoading, loadMessages, sendMessage, clearConversation } = useAssistantStore();
  const quickSuggestionsEnabled = useAppStore((s) => s.settings.assistantQuickSuggestions);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
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

  // The input bar sits just above the floating tab bar with a hairline gap.
  // When the keyboard is open, the bar should rest directly on the keyboard.
  const tabBarSafeInset =
    Math.max(insets.bottom, spacing.sm) + spacing.sm + FLOATING_TAB_BAR_HEIGHT + TAB_BAR_HAIRLINE_GAP;

  // iOS needs KeyboardAvoidingView padding + zero bottom inset when the keyboard
  // is open so the input rests on the keyboard. Android relies on
  // windowSoftInputMode=adjustResize, so we keep a constant tab-bar inset and
  // disable KeyboardAvoidingView behavior there to avoid the input staying
  // slightly above its rest position after the keyboard closes.
  const isIos = Platform.OS === 'ios';
  const inputBottomInset = isIos ? (isKeyboardVisible ? 0 : tabBarSafeInset) : tabBarSafeInset;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={isIos ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Assistant</Text>
            <Text style={[styles.subtitle, { color: isLoading ? colors.accentPrimary : colors.textSecondary }]}>
              {isLoading ? 'Thinking…' : 'Offline · Rule-based'}
            </Text>
          </View>
          {hasMessages && (
            <TouchableOpacity onPress={handleClearConfirm} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages or Empty state — takes remaining space */}
        <View style={styles.messagesArea}>
          {!hasMessages ? (
            <View style={styles.emptyState}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.accentPrimary}20` }]}>
                <Ionicons name="sparkles" size={36} color={colors.accentPrimary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Ask me anything</Text>
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
              ListFooterComponent={isLoading ? <TypingIndicator colors={colors} /> : null}
            />
          )}
        </View>

        {/* Suggestions */}
        {showSuggestions && quickSuggestionsEnabled && (
          <SuggestedPrompts
            prompts={SUGGESTED_PROMPTS}
            onPromptPress={(prompt) => handleSend(prompt)}
          />
        )}

        {/* Input bar */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          bottomInset={inputBottomInset}
        />
      </KeyboardAvoidingView>
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
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  clearBtn: { padding: spacing.xs },
  messagesArea: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: typography.sizes.base * 1.6,
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 4,
    marginTop: spacing.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingText: {
    fontSize: typography.sizes.xs,
    marginLeft: 4,
  },
});
