import { migrateDatabaseAsync } from '../index';
import { createTestDb, tableColumns, type TestDb } from './testDb';

const EXPECTED_TABLES = [
  'transactions',
  'tasks',
  'events',
  'budgets',
  'incomes',
  'recurring_rules',
  'bills',
  'goals',
  'fuliza_loans',
  'merchant_categories',
  'paybill_registry',
  'app_settings',
  'user_profile',
  'exports',
  'assistant_messages',
  'import_audit',
];

describe('migrateDatabaseAsync', () => {
  let t: TestDb;

  beforeEach(() => {
    t = createTestDb();
  });

  afterEach(() => {
    t.close();
  });

  it('creates every expected table', async () => {
    await migrateDatabaseAsync(t.db);
    const tables = t.raw
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r: any) => r.name);
    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table);
    }
  });

  it('is idempotent — running twice must not throw or duplicate', async () => {
    await migrateDatabaseAsync(t.db);
    await expect(migrateDatabaseAsync(t.db)).resolves.not.toThrow();
    const count = t.raw
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'transactions'")
      .get().n;
    expect(count).toBe(1);
  });

  it('budgets gains the is_active migration column', async () => {
    await migrateDatabaseAsync(t.db);
    expect(tableColumns(t.raw, 'budgets')).toContain('is_active');
  });

  it('transactions carries every column the native SMS pipeline writes', async () => {
    await migrateDatabaseAsync(t.db);
    const cols = tableColumns(t.raw, 'transactions');
    // These exact columns are bound by DbWriter.insertTransaction — if one is
    // renamed or dropped, native imports fail at runtime. Lock them here.
    for (const col of [
      'id', 'amount', 'merchant', 'category', 'date', 'source', 'transaction_type',
      'mpesa_code', 'source_hash', 'raw_sms', 'description', 'balance_after', 'fee',
      'status', 'created_at', 'updated_at', 'sync_state', 'record_source',
      'revision', 'inferred_category', 'inference_source', 'semantic_hash',
    ]) {
      expect(cols).toContain(col);
    }
  });

  it('bills carries the columns BillRepository binds', async () => {
    await migrateDatabaseAsync(t.db);
    const cols = tableColumns(t.raw, 'bills');
    for (const col of [
      'id', 'user_id', 'title', 'amount', 'cycle', 'next_due_date', 'last_paid_at',
      'notes', 'is_active', 'paid_status', 'created_at', 'updated_at',
      'sync_state', 'deleted_at', 'revision',
    ]) {
      expect(cols).toContain(col);
    }
  });

  it('recurring_rules carries the columns RecurringRuleRepository binds', async () => {
    await migrateDatabaseAsync(t.db);
    const cols = tableColumns(t.raw, 'recurring_rules');
    for (const col of [
      'id', 'title', 'type', 'cadence', 'next_run_at', 'amount', 'category',
      'enabled', 'created_at', 'updated_at', 'sync_state', 'record_source',
      'deleted_at', 'revision', 'user_id',
    ]) {
      expect(cols).toContain(col);
    }
  });
});
