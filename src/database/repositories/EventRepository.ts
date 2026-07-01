import type { SQLiteDatabase } from 'expo-sqlite';
import type { CalendarEvent, EventType, EventKind, RepeatRule, TaskPriority, TaskStatus } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface EventRecord extends SyncableRecord {
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  type: EventType;
  kind: EventKind;
  importance: TaskPriority;
  status: TaskStatus;
  has_reminder: number;
  reminder_minutes_before: number | null;
  reminder_offsets: string | null;
  reminder_time_of_day_minutes: number | null;
  all_day: number;
  repeat_rule: RepeatRule;
  repeat_end_date: string | null;
  location: string | null;
  guests: string | null;
  time_zone_id: string;
  alarm_enabled: number;
}

export class EventRepository extends BaseRepository<EventRecord> {
  protected tableName = 'events';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>): Promise<EventRecord> {
    const record: EventRecord = {
      ...this.generateRecordBase(data.recordSource, data.userId),
      title: data.title,
      description: data.description ?? null,
      date: data.date,
      end_date: data.endDate ?? null,
      type: data.type,
      kind: data.kind,
      importance: data.importance,
      status: data.status,
      has_reminder: data.hasReminder ? 1 : 0,
      reminder_minutes_before: data.reminderMinutesBefore ?? null,
      reminder_offsets: data.reminderOffsets ? JSON.stringify(data.reminderOffsets) : null,
      reminder_time_of_day_minutes: data.reminderTimeOfDayMinutes ?? null,
      all_day: data.allDay ? 1 : 0,
      repeat_rule: data.repeatRule,
      repeat_end_date: data.repeatEndDate ?? null,
      location: data.location ?? null,
      guests: data.guests ? JSON.stringify(data.guests) : null,
      time_zone_id: data.timeZoneId,
      alarm_enabled: data.alarmEnabled ? 1 : 0,
    } as EventRecord;

    await this.db.runAsync(
      `INSERT INTO events (
        id, title, description, date, end_date, type, kind, importance, status, has_reminder,
        reminder_minutes_before, reminder_offsets, reminder_time_of_day_minutes, all_day, repeat_rule,
        repeat_end_date, location, guests, time_zone_id, alarm_enabled, created_at, updated_at,
        sync_state, record_source, deleted_at, revision, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.description,
        record.date,
        record.end_date,
        record.type,
        record.kind,
        record.importance,
        record.status,
        record.has_reminder,
        record.reminder_minutes_before,
        record.reminder_offsets,
        record.reminder_time_of_day_minutes,
        record.all_day,
        record.repeat_rule,
        record.repeat_end_date,
        record.location,
        record.guests,
        record.time_zone_id,
        record.alarm_enabled,
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

  async update(id: string, data: Partial<CalendarEvent>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof EventRecord> = {
      title: 'title',
      description: 'description',
      date: 'date',
      endDate: 'end_date',
      type: 'type',
      kind: 'kind',
      importance: 'importance',
      status: 'status',
      hasReminder: 'has_reminder',
      reminderMinutesBefore: 'reminder_minutes_before',
      reminderOffsets: 'reminder_offsets',
      reminderTimeOfDayMinutes: 'reminder_time_of_day_minutes',
      allDay: 'all_day',
      repeatRule: 'repeat_rule',
      repeatEndDate: 'repeat_end_date',
      location: 'location',
      guests: 'guests',
      timeZoneId: 'time_zone_id',
      alarmEnabled: 'alarm_enabled',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        const value = (data as any)[key];
        if (key === 'reminderOffsets' || key === 'guests') {
          values.push(value ? JSON.stringify(value) : null);
        } else if (['hasReminder', 'allDay', 'alarmEnabled'].includes(key)) {
          values.push(value ? 1 : 0);
        } else {
          values.push(value ?? null);
        }
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<EventRecord | null> {
    return await this.db.getFirstAsync<EventRecord>(
      `SELECT * FROM events WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findInRange(start: string, end: string): Promise<EventRecord[]> {
    return await this.db.getAllAsync<EventRecord>(
      `SELECT * FROM events WHERE ${this.notDeletedClause()} AND date >= ? AND date < ? ORDER BY date ASC`,
      [start, end]
    );
  }

  async findAll(): Promise<EventRecord[]> {
    return await this.db.getAllAsync<EventRecord>(
      `SELECT * FROM events WHERE ${this.notDeletedClause()} ORDER BY date DESC`
    );
  }

  async findByDate(date: string): Promise<EventRecord[]> {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return await this.findInRange(start.toISOString(), end.toISOString());
  }

  async search(query: string, limit: number = 50): Promise<EventRecord[]> {
    const like = `%${query}%`;
    return await this.db.getAllAsync<EventRecord>(
      `SELECT * FROM events WHERE ${this.notDeletedClause()} AND (title LIKE ? OR description LIKE ? OR location LIKE ?) ORDER BY date ASC LIMIT ?`,
      [like, like, like, limit]
    );
  }

  async findNextUpcoming(): Promise<EventRecord | null> {
    return await this.db.getFirstAsync<EventRecord>(
      `SELECT * FROM events WHERE ${this.notDeletedClause()} AND date >= ? ORDER BY date ASC LIMIT 1`,
      [nowIso()]
    );
  }
}
