import type { SQLiteDatabase } from 'expo-sqlite';
import { BaseRepository, type SyncableRecord } from './BaseRepository';

export interface ExportDbRecord extends SyncableRecord {
  file_path: string;
  file_size: number | null;
  format: string;
  record_count: number | null;
}

export interface ExportCreateInput {
  filePath: string;
  fileSize?: number;
  format: string;
  recordCount?: number;
}

export class ExportRepository extends BaseRepository<ExportDbRecord> {
  protected tableName = 'exports';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: ExportCreateInput): Promise<ExportDbRecord> {
    const record: ExportDbRecord = {
      ...this.generateRecordBase('manual', undefined),
      file_path: data.filePath,
      file_size: data.fileSize ?? null,
      format: data.format,
      record_count: data.recordCount ?? null,
    } as ExportDbRecord;

    await this.db.runAsync(
      `INSERT INTO exports (id, file_path, file_size, format, record_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.file_path,
        record.file_size,
        record.format,
        record.record_count,
        record.created_at,
      ]
    );

    return record;
  }

  async findAll(): Promise<ExportDbRecord[]> {
    return await this.db.getAllAsync<ExportDbRecord>(
      `SELECT * FROM exports ORDER BY created_at DESC`
    );
  }
}
