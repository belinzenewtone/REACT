/**
 * SQLite schema ported from the Kotlin LifeOS SQLDelight tables.
 * Soft-delete pattern (deleted_at) and sync metadata are preserved for parity.
 */

export const DATABASE_NAME = 'lifeos.db';
export const DATABASE_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  mpesa_code TEXT,
  source_hash TEXT,
  raw_sms TEXT,
  description TEXT,
  notes TEXT,
  balance_after REAL,
  fee REAL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT,
  inferred_category INTEGER NOT NULL DEFAULT 0,
  inference_source TEXT,
  semantic_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_code ON transactions(mpesa_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_mpesa_code_unique ON transactions(mpesa_code) WHERE mpesa_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source_hash ON transactions(source_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_semantic_hash ON transactions(semantic_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reminder_offsets TEXT,
  alarm_enabled INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT,
  time_spent_seconds INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  end_date TEXT,
  type TEXT NOT NULL DEFAULT 'event',
  kind TEXT NOT NULL DEFAULT 'other',
  importance TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  has_reminder INTEGER NOT NULL DEFAULT 0,
  reminder_minutes_before INTEGER,
  reminder_offsets TEXT,
  reminder_time_of_day_minutes INTEGER,
  all_day INTEGER NOT NULL DEFAULT 0,
  repeat_rule TEXT NOT NULL DEFAULT 'none',
  repeat_end_date TEXT,
  location TEXT,
  guests TEXT,
  time_zone_id TEXT NOT NULL DEFAULT 'UTC',
  alarm_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  limit_amount REAL NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  alert_threshold REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON budgets(deleted_at);

CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL,
  source TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  frequency TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  cadence TEXT NOT NULL,
  next_run_at TEXT NOT NULL,
  amount REAL,
  category TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_next_run ON recurring_rules(next_run_at);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  cycle TEXT NOT NULL,
  next_due_date TEXT NOT NULL,
  last_paid_at TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  paid_status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_bills_next_due ON bills(next_due_date);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  target_value REAL NOT NULL,
  current_value REAL NOT NULL DEFAULT 0,
  unit TEXT,
  category TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fuliza_loans (
  id TEXT PRIMARY KEY NOT NULL,
  draw_code TEXT,
  draw_amount_kes REAL NOT NULL,
  total_repaid_kes REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  draw_date TEXT NOT NULL,
  last_repayment_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_fuliza_loans_status ON fuliza_loans(status);

CREATE TABLE IF NOT EXISTS merchant_categories (
  id TEXT PRIMARY KEY NOT NULL,
  merchant TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  user_corrected INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_merchant_categories_merchant ON merchant_categories(merchant);

CREATE TABLE IF NOT EXISTS paybill_registry (
  paybill_number TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_amount_kes REAL,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  format TEXT NOT NULL,
  created_at TEXT NOT NULL,
  record_count INTEGER
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  actions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  record_source TEXT NOT NULL DEFAULT 'manual',
  deleted_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation ON assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created_at ON assistant_messages(created_at);

CREATE TABLE IF NOT EXISTS import_audit (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mpesa_code    TEXT,
  raw_message   TEXT NOT NULL,
  amount        REAL,
  merchant      TEXT,
  outcome       TEXT NOT NULL,
  failure_reason TEXT,
  confidence    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_import_audit_outcome    ON import_audit(outcome);
CREATE INDEX IF NOT EXISTS idx_import_audit_created_at ON import_audit(created_at DESC);
`;
