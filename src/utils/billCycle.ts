/**
 * Pure bill-cycle math — extracted from BillFormScreen so it is unit-testable.
 *
 * Semantics: for repeating cycles, marking a bill "Paid" means "done for THIS
 * cycle" — the due date advances one cycle (day-of-month clamped so a 31st
 * bill never drifts) and paid resets so the next cycle's reminder re-arms.
 * One-time bills stay paid.
 */

import { addMonthsClamped } from './recurrence';

export type BillCycleKind = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time';

export interface BillCycleResult {
  /** ISO due date to persist (advanced when paid on a repeating cycle). */
  nextDueIso: string;
  /** Paid flag to persist (reset to false when the cycle advanced). */
  paidStatus: boolean;
  /** True when the due date was rolled to the next cycle. */
  advanced: boolean;
}

/**
 * Compute the persisted due date + paid flag for a bill save.
 *
 * @param dueIso ISO date the user picked (UTC midnight of the due day).
 * @param cycle Bill cycle.
 * @param paid Whether the user marked the bill paid.
 */
export function applyBillPayment(dueIso: string, cycle: BillCycleKind, paid: boolean): BillCycleResult {
  if (!paid || cycle === 'one_time') {
    return { nextDueIso: dueIso, paidStatus: paid, advanced: false };
  }

  const d = new Date(dueIso);
  if (isNaN(d.getTime())) {
    return { nextDueIso: dueIso, paidStatus: paid, advanced: false };
  }

  const anchorDay = d.getUTCDate();
  let next: Date;
  switch (cycle) {
    case 'daily':
      next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly':
      next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'monthly':
      next = addMonthsClamped(d, 1, anchorDay);
      break;
    case 'yearly':
      next = addMonthsClamped(d, 12, anchorDay);
      break;
    default:
      return { nextDueIso: dueIso, paidStatus: paid, advanced: false };
  }

  return { nextDueIso: next.toISOString(), paidStatus: false, advanced: true };
}
