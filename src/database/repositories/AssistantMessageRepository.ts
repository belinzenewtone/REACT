import type { SQLiteDatabase } from 'expo-sqlite';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface AssistantMessageRecord extends SyncableRecord {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  actions: string | null;
}

export class AssistantMessageRepository extends BaseRepository<AssistantMessageRecord> {
  protected tableName = 'assistant_messages';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    actions?: string[]
  ): Promise<AssistantMessageRecord> {
    const record: AssistantMessageRecord = {
      ...this.generateRecordBase('manual'),
      conversation_id: conversationId,
      role,
      content,
      actions: actions ? JSON.stringify(actions) : null,
    } as AssistantMessageRecord;

    await this.db.runAsync(
      `INSERT INTO assistant_messages (
        id, conversation_id, role, content, actions, created_at, updated_at, sync_state,
        record_source, deleted_at, revision, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.conversation_id,
        record.role,
        record.content,
        record.actions,
        record.created_at,
        record.updated_at,
        record.sync_state,
        record.record_source,
        record.deleted_at,
        record.revision,
        record.user_id,
      ]
    );

    return record;
  }

  async getConversationMessages(conversationId: string, limit = 100): Promise<AssistantMessageRecord[]> {
    return await this.db.getAllAsync<AssistantMessageRecord>(
      `SELECT * FROM assistant_messages
       WHERE ${this.notDeletedClause()} AND conversation_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [conversationId, limit]
    );
  }

  async getConversations(limit = 50): Promise<{ conversation_id: string; last_message: string; updated_at: string }[]> {
    return await this.db.getAllAsync<{ conversation_id: string; last_message: string; updated_at: string }>(
      `SELECT conversation_id, content as last_message, MAX(created_at) as updated_at
       FROM assistant_messages
       WHERE ${this.notDeletedClause()}
       GROUP BY conversation_id
       ORDER BY updated_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  async clearConversation(conversationId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE assistant_messages SET deleted_at = ?, updated_at = ?, sync_state = 'pending'
       WHERE conversation_id = ? AND ${this.notDeletedClause()}`,
      [nowIso(), nowIso(), conversationId]
    );
  }
}
