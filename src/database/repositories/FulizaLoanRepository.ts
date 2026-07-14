import type { SQLiteDatabase } from 'expo-sqlite';
import type { FulizaLoan } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';
import { setFulizaRepayment as nativeSetFulizaRepayment, isSmsModuleAvailable } from '../../../modules/lifeos-sms';

export interface FulizaLoanDbRecord extends SyncableRecord {
  draw_code: string | null;
  draw_amount_kes: number;
  total_repaid_kes: number;
  status: 'active' | 'repaid' | 'defaulted';
  draw_date: string;
  last_repayment_date: string | null;
}

export class FulizaLoanRepository extends BaseRepository<FulizaLoanDbRecord> {
  protected tableName = 'fuliza_loans';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<FulizaLoan, 'id' | 'createdAt' | 'updatedAt'>): Promise<FulizaLoanDbRecord> {
    const record: FulizaLoanDbRecord = {
      ...this.generateRecordBase('manual', data.userId),
      draw_code: data.drawCode ?? null,
      draw_amount_kes: data.drawAmountKes,
      total_repaid_kes: data.totalRepaidKes,
      status: data.status,
      draw_date: data.drawDate,
      last_repayment_date: data.lastRepaymentDate ?? null,
    } as FulizaLoanDbRecord;

    await this.db.runAsync(
      `INSERT INTO fuliza_loans (id, draw_code, draw_amount_kes, total_repaid_kes, status, draw_date, last_repayment_date, created_at, updated_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.draw_code,
        record.draw_amount_kes,
        record.total_repaid_kes,
        record.status,
        record.draw_date,
        record.last_repayment_date,
        record.created_at,
        record.updated_at,
        record.user_id,
      ]
    );

    return record;
  }

  async update(id: string, data: Partial<FulizaLoan>): Promise<void> {
    const sets: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [nowIso()];

    const map: Record<string, keyof FulizaLoanDbRecord> = {
      drawCode: 'draw_code',
      drawAmountKes: 'draw_amount_kes',
      totalRepaidKes: 'total_repaid_kes',
      status: 'status',
      drawDate: 'draw_date',
      lastRepaymentDate: 'last_repayment_date',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        values.push((data as any)[key] ?? null);
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE fuliza_loans SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<FulizaLoanDbRecord | null> {
    return await this.db.getFirstAsync<FulizaLoanDbRecord>(
      `SELECT * FROM fuliza_loans WHERE id = ?`,
      [id]
    );
  }

  async findAll(limit = 50): Promise<FulizaLoanDbRecord[]> {
    return await this.db.getAllAsync<FulizaLoanDbRecord>(
      `SELECT * FROM fuliza_loans ORDER BY draw_date DESC LIMIT ?`,
      [limit]
    );
  }

  async findAllPaged(offset = 0, limit = 50): Promise<FulizaLoanDbRecord[]> {
    return await this.db.getAllAsync<FulizaLoanDbRecord>(
      `SELECT * FROM fuliza_loans ORDER BY draw_date DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  /**
   * Record a Fuliza repayment. Routes through the native module when available
   * so the write is serialised with DbWriter.setFulizaOutstanding() — eliminating
   * the race where a charge-notice SMS resets total_repaid_kes to 0 after a JS write.
   * Falls back to a direct SQLite write on Expo Go / iOS.
   */
  async recordRepayment(amountKes: number, availableLimitKes: number): Promise<void> {
    if (isSmsModuleAvailable()) {
      await nativeSetFulizaRepayment(amountKes, availableLimitKes);
    } else {
      const now = nowIso();
      await this.db.runAsync(
        `UPDATE fuliza_loans SET total_repaid_kes = total_repaid_kes + ?, last_repayment_date = ?, updated_at = ? WHERE status = 'active'`,
        [amountKes, now, now]
      );
    }
  }

  async search(query: string, limit: number = 50): Promise<FulizaLoanDbRecord[]> {
    const like = `%${query}%`;
    return await this.db.getAllAsync<FulizaLoanDbRecord>(
      `SELECT * FROM fuliza_loans WHERE (draw_code LIKE ? OR status LIKE ?) ORDER BY draw_date DESC LIMIT ?`,
      [like, like, limit]
    );
  }
}
