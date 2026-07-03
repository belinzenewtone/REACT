import { applyBillPayment } from '../billCycle';

const DUE = '2026-07-31T00:00:00.000Z';

describe('applyBillPayment', () => {
  it('leaves an unpaid bill untouched', () => {
    const r = applyBillPayment(DUE, 'monthly', false);
    expect(r).toEqual({ nextDueIso: DUE, paidStatus: false, advanced: false });
  });

  it('keeps a one-time bill paid without advancing', () => {
    const r = applyBillPayment(DUE, 'one_time', true);
    expect(r).toEqual({ nextDueIso: DUE, paidStatus: true, advanced: false });
  });

  it('paid daily bill advances one day and resets paid', () => {
    const r = applyBillPayment('2026-07-03T00:00:00.000Z', 'daily', true);
    expect(r.nextDueIso).toBe('2026-07-04T00:00:00.000Z');
    expect(r.paidStatus).toBe(false);
    expect(r.advanced).toBe(true);
  });

  it('paid weekly bill advances seven days', () => {
    const r = applyBillPayment('2026-07-03T00:00:00.000Z', 'weekly', true);
    expect(r.nextDueIso).toBe('2026-07-10T00:00:00.000Z');
    expect(r.advanced).toBe(true);
  });

  it('paid monthly bill on the 31st clamps to short months', () => {
    const r = applyBillPayment(DUE, 'monthly', true); // Jul 31 → Aug 31
    expect(r.nextDueIso).toBe('2026-08-31T00:00:00.000Z');
    const r2 = applyBillPayment(r.nextDueIso, 'monthly', true); // Aug 31 → Sep 30 (clamped)
    expect(r2.nextDueIso).toBe('2026-09-30T00:00:00.000Z');
  });

  it('paid monthly bill restores the anchor... within a single hop only', () => {
    // Note: the anchor is per-save (derived from the current due date), so a
    // Sep 30 due date advances to Oct 30. Restoring the original 31st anchor
    // across saves would require persisting it — documented behavior.
    const r = applyBillPayment('2026-09-30T00:00:00.000Z', 'monthly', true);
    expect(r.nextDueIso).toBe('2026-10-30T00:00:00.000Z');
  });

  it('paid yearly bill advances one year', () => {
    const r = applyBillPayment('2026-01-15T00:00:00.000Z', 'yearly', true);
    expect(r.nextDueIso).toBe('2027-01-15T00:00:00.000Z');
    expect(r.paidStatus).toBe(false);
  });

  it('paid yearly bill on Feb 29 clamps to Feb 28', () => {
    const r = applyBillPayment('2028-02-29T00:00:00.000Z', 'yearly', true);
    expect(r.nextDueIso).toBe('2029-02-28T00:00:00.000Z');
  });

  it('invalid date is passed through unchanged', () => {
    const r = applyBillPayment('garbage', 'monthly', true);
    expect(r).toEqual({ nextDueIso: 'garbage', paidStatus: true, advanced: false });
  });
});
