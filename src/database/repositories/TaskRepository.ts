import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface TaskRecord extends SyncableRecord {
  title: string;
  description: string | null;
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  completed_at: string | null;
  reminder_offsets: string | null;
  alarm_enabled: number;
  time_spent_seconds: number;
}

export class TaskRepository extends BaseRepository<TaskRecord> {
  protected tableName = 'tasks';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>): Promise<TaskRecord> {
    const record: TaskRecord = {
      ...this.generateRecordBase(data.recordSource, data.userId),
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      deadline: data.deadline ?? null,
      status: data.status,
      completed_at: data.completedAt ?? null,
      reminder_offsets: data.reminderOffsets ? JSON.stringify(data.reminderOffsets) : null,
      alarm_enabled: data.alarmEnabled ? 1 : 0,
      time_spent_seconds: data.timeSpentSeconds ?? 0,
    } as TaskRecord;

    await this.db.runAsync(
      `INSERT INTO tasks (
        id, title, description, priority, deadline, status, completed_at, created_at, updated_at,
        reminder_offsets, alarm_enabled, sync_state, record_source, deleted_at, revision, user_id,
        time_spent_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.description,
        record.priority,
        record.deadline,
        record.status,
        record.completed_at,
        record.created_at,
        record.updated_at,
        record.reminder_offsets,
        record.alarm_enabled,
        record.sync_state,
        record.record_source,
        record.deleted_at ?? null,
        record.revision,
        record.user_id,
        record.time_spent_seconds,
      ]
    );

    return record;
  }

  async update(id: string, data: Partial<Task>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof TaskRecord> = {
      title: 'title',
      description: 'description',
      priority: 'priority',
      deadline: 'deadline',
      status: 'status',
      completedAt: 'completed_at',
      reminderOffsets: 'reminder_offsets',
      alarmEnabled: 'alarm_enabled',
      timeSpentSeconds: 'time_spent_seconds',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        const value = (data as any)[key];
        if (key === 'reminderOffsets') {
          values.push(value ? JSON.stringify(value) : null);
        } else if (key === 'alarmEnabled') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value ?? null);
        }
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<TaskRecord | null> {
    return await this.db.getFirstAsync<TaskRecord>(
      `SELECT * FROM tasks WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(options: {
    status?: TaskStatus;
    priority?: TaskPriority;
    dueBefore?: string;
    dueAfter?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<TaskRecord[]> {
    const where: string[] = [this.notDeletedClause()];
    const params: (string | number)[] = [];

    if (options.status) {
      where.push('status = ?');
      params.push(options.status);
    }
    if (options.priority) {
      where.push('priority = ?');
      params.push(options.priority);
    }
    if (options.dueBefore) {
      where.push('deadline < ?');
      params.push(options.dueBefore);
    }
    if (options.dueAfter) {
      where.push('deadline >= ?');
      params.push(options.dueAfter);
    }

    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    return await this.db.getAllAsync<TaskRecord>(
      `SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY deadline ASC, priority DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  }

  async countActive(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM tasks WHERE status = 'active' AND ${this.notDeletedClause()}`
    );
    return row?.n ?? 0;
  }

  async search(query: string, limit: number = 50): Promise<TaskRecord[]> {
    const like = `%${query}%`;
    return await this.db.getAllAsync<TaskRecord>(
      `SELECT * FROM tasks WHERE ${this.notDeletedClause()} AND (title LIKE ? OR description LIKE ?) ORDER BY deadline ASC, priority DESC LIMIT ?`,
      [like, like, limit]
    );
  }

  async toggleComplete(id: string): Promise<void> {
    const task = await this.findById(id);
    if (!task) return;

    const nowCompleted = task.status === 'active';
    await this.update(id, {
      status: nowCompleted ? 'completed' : 'active',
      completedAt: nowCompleted ? nowIso() : undefined,
    });
  }

  async countByStatus(): Promise<{ completed: number; pending: number }> {
    const rows = await this.db.getAllAsync<{ status: string; n: number }>(
      `SELECT status, COUNT(*) as n FROM tasks WHERE ${this.notDeletedClause()} GROUP BY status`
    );
    let completed = 0, pending = 0;
    for (const r of rows) {
      if (r.status === 'completed') completed = r.n;
      else pending += r.n;
    }
    return { completed, pending };
  }
}
