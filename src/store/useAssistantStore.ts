import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AssistantMessageRepository } from '../database/repositories/AssistantMessageRepository';
import { AssistantEngine, type HistoryMessage } from '../services/assistant/AssistantEngine';
import { useAppStore } from './useAppStore';
import type { ChatMessageData } from '../components/assistant/ChatMessage';

const CONVERSATION_ID = 'default';

interface AssistantState {
  messages: ChatMessageData[];
  isLoading: boolean;

  loadMessages: (db: SQLiteDatabase) => Promise<void>;
  sendMessage: (db: SQLiteDatabase, text: string) => Promise<void>;
  clearConversation: (db: SQLiteDatabase) => Promise<void>;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  isLoading: false,

  loadMessages: async (db) => {
    const repo = new AssistantMessageRepository(db);
    const records = await repo.getConversationMessages(CONVERSATION_ID);

    const messages: ChatMessageData[] = records.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      actions: r.actions ? JSON.parse(r.actions) : undefined,
      createdAt: r.created_at,
    }));

    set({ messages });
  },

  sendMessage: async (db, text) => {
    const repo = new AssistantMessageRepository(db);
    const userName = useAppStore.getState().profile?.name ?? null;
    const engine = new AssistantEngine(db, userName);

    set({ isLoading: true });

    try {
      const userRecord = await repo.createMessage(CONVERSATION_ID, 'user', text);

      // Pass last 10 messages as context so follow-up questions resolve correctly.
      const recentHistory: HistoryMessage[] = get().messages
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await engine.process(text, recentHistory);
      const assistantRecord = await repo.createMessage(
        CONVERSATION_ID,
        'assistant',
        response.content,
        response.actions
      );

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: userRecord.id,
            role: 'user',
            content: userRecord.content,
            createdAt: userRecord.created_at,
          },
          {
            id: assistantRecord.id,
            role: 'assistant',
            content: assistantRecord.content,
            actions: response.actions,
            createdAt: assistantRecord.created_at,
          },
        ],
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  clearConversation: async (db) => {
    const repo = new AssistantMessageRepository(db);
    await repo.clearConversation(CONVERSATION_ID);
    set({ messages: [] });
  },
}));
