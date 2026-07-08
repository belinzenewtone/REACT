import { migrateDatabaseAsync } from '../index';
import { BillRepository } from '../repositories/BillRepository';
import { RecurringRuleRepository } from '../repositories/RecurringRuleRepository';
import { createTestDb, type TestDb } from './testDb';

/**
 * Contract tests: the repositories' real SQL runs against a real (in-memory)
 * SQLite engine. Guards field mapping (camelCase ↔ snake_case), sync_state /
 * revision bookkeeping, and soft-delete semantics for every save path the
 * planner store uses.
 */
describe('repository contracts', () => {
  let t: TestDb;

  beforeEach(async () => {
    t = createTestDb();
    await migrateDatabaseAsync(t.db);
  });

  afterEach(() => {
    t.close();
  });

  describe('BillRepository', () => {
    const input = {
      title: 'Rent',
      amount: 25000,
      cycle: 'monthly' as const,
      nextDueDate: '2026-07-31T00:00:00.000Z',
      isActive: true,
      paidStatus: false,
    };

    it('create → findById round-trips every field', async () => {
      const repo = new BillRepository(t.db);
      const created = await repo.create(input);
      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe('Rent');
      expect(found!.amount).toBe(25000);
      expect(found!.cycle).toBe('monthly');
      expect(found!.next_due_date).toBe(input.nextDueDate);
      expect(found!.is_active).toBe(1);
      expect(found!.paid_status).toBe(0);
      expect(found!.sync_state).toBe('pending');
      expect(found!.revision).toBe(1);
      expect(found!.deleted_at).toBeNull();
    });

    it('update maps camelCase fields, bumps revision, resets sync_state', async () => {
      const repo = new BillRepository(t.db);
      const created = await repo.create(input);

      await repo.update(created.id, {
        nextDueDate: '2026-08-31T00:00:00.000Z',
        paidStatus: true,
        amount: 26000,
      });

      const found = await repo.findById(created.id);
      expect(found!.next_due_date).toBe('2026-08-31T00:00:00.000Z');
      expect(found!.paid_status).toBe(1);
      expect(found!.amount).toBe(26000);
      expect(found!.revision).toBe(2);
      expect(found!.sync_state).toBe('pending');
    });

    it('softDelete hides the row from findById and findAll', async () => {
      const repo = new BillRepository(t.db);
      const created = await repo.create(input);

      await repo.softDelete(created.id);

      expect(await repo.findById(created.id)).toBeNull();
      expect(await repo.findAll()).toHaveLength(0);
      // Row still physically present (soft delete).
      const rawRow = t.raw.prepare('SELECT deleted_at FROM bills WHERE id = ?').get(created.id);
      expect(rawRow.deleted_at).not.toBeNull();
    });

    it('findAll orders by due date and search matches title', async () => {
      const repo = new BillRepository(t.db);
      await repo.create({ ...input, title: 'Water', nextDueDate: '2026-08-05T00:00:00.000Z' });
      await repo.create({ ...input, title: 'Rent', nextDueDate: '2026-07-31T00:00:00.000Z' });

      const all = await repo.findAll();
      expect(all.map((b) => b.title)).toEqual(['Rent', 'Water']);

      const hits = await repo.search('wat');
      expect(hits).toHaveLength(1);
      expect(hits[0].title).toBe('Water');
    });
  });

  describe('RecurringRuleRepository', () => {
    const input = {
      title: 'Gym membership',
      type: 'expense' as const,
      cadence: 'monthly' as const,
      nextRunAt: '2026-07-05T09:00:00.000Z',
      amount: 3000,
      category: 'health',
      enabled: true,
      recordSource: 'manual' as const,
    };

    it('create → findById round-trips fields', async () => {
      const repo = new RecurringRuleRepository(t.db);
      const created = await repo.create(input as any);
      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe('Gym membership');
      expect(found!.cadence).toBe('monthly');
      expect(found!.next_run_at).toBe(input.nextRunAt);
      expect(found!.enabled).toBe(1);
    });

    it('persists the notification roll-forward (nextRunAt update)', async () => {
      // This is the exact write path syncRecurringReminders uses after a
      // rule's next_run_at slips into the past.
      const repo = new RecurringRuleRepository(t.db);
      const created = await repo.create(input as any);

      await repo.update(created.id, { nextRunAt: '2026-08-05T09:00:00.000Z' });

      const found = await repo.findById(created.id);
      expect(found!.next_run_at).toBe('2026-08-05T09:00:00.000Z');
      expect(found!.revision).toBe(2);
    });

    it('disabling a rule persists enabled = 0', async () => {
      const repo = new RecurringRuleRepository(t.db);
      const created = await repo.create(input as any);

      await repo.update(created.id, { enabled: false });

      const found = await repo.findById(created.id);
      expect(found!.enabled).toBe(0);
    });
  });
});
