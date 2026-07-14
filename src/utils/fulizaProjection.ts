/**
 * Fuliza M-PESA loan projection math (S5).
 *
 * Safaricom charges a once-off access fee on draw, then a daily maintenance
 * fee that compounds. This module encapsulates the fee schedule published in
 * the 2024 Safaricom Fuliza tariff and projects:
 *   - Total interest accrued to any future date.
 *   - Estimated payoff date given a regular daily/weekly repayment.
 *   - Remaining balance at each point in a repayment schedule.
 *
 * All math is pure (no side effects, no IO) so it is straightforward to test.
 * Dollar values are in KES throughout.
 *
 * Tariff source: Safaricom Fuliza M-PESA terms (updated 2024).
 * Approximate tiers — update ACCESS_FEE_TIERS and DAILY_FEE_TIERS when
 * Safaricom revises the schedule.
 */

/** Access fee charged once on draw, expressed as a fixed amount per tier. */
const ACCESS_FEE_TIERS: Array<{ maxAmount: number; fee: number }> = [
  { maxAmount: 100,   fee: 2   },
  { maxAmount: 500,   fee: 5   },
  { maxAmount: 1_000, fee: 10  },
  { maxAmount: 1_500, fee: 15  },
  { maxAmount: 2_500, fee: 25  },
  { maxAmount: 5_000, fee: 45  },
  { maxAmount: 7_500, fee: 60  },
  { maxAmount: 10_000,fee: 75  },
  { maxAmount: 15_000,fee: 100 },
  { maxAmount: 20_000,fee: 125 },
  { maxAmount: 30_000,fee: 150 },
  { maxAmount: Infinity, fee: 200 },
];

/** Daily maintenance fee per tier (applied each day after day 0). */
const DAILY_FEE_TIERS: Array<{ maxAmount: number; fee: number }> = [
  { maxAmount: 100,    fee: 2  },
  { maxAmount: 500,    fee: 5  },
  { maxAmount: 1_000,  fee: 10 },
  { maxAmount: 1_500,  fee: 15 },
  { maxAmount: 2_500,  fee: 20 },
  { maxAmount: 5_000,  fee: 30 },
  { maxAmount: 7_500,  fee: 45 },
  { maxAmount: 10_000, fee: 55 },
  { maxAmount: 15_000, fee: 60 },
  { maxAmount: 20_000, fee: 65 },
  { maxAmount: 30_000, fee: 70 },
  { maxAmount: Infinity, fee: 75 },
];

function lookupFee(tiers: typeof ACCESS_FEE_TIERS, principal: number): number {
  for (const tier of tiers) {
    if (principal <= tier.maxAmount) return tier.fee;
  }
  return tiers[tiers.length - 1].fee;
}

export function accessFeeForAmount(principalKes: number): number {
  return lookupFee(ACCESS_FEE_TIERS, principalKes);
}

export function dailyFeeForAmount(principalKes: number): number {
  return lookupFee(DAILY_FEE_TIERS, principalKes);
}

export interface ProjectionPoint {
  day: number;
  outstandingKes: number;
  totalInterestKes: number;
}

export interface FulizaProjection {
  /** Original draw amount. */
  principalKes: number;
  /** Once-off access fee charged at draw. */
  accessFeeKes: number;
  /** Daily maintenance fee applied per day. */
  dailyFeeKes: number;
  /** Total amount owed after `daysElapsed` days (principal + fees). */
  totalOwedKes: number;
  /** Interest (access fee + accrued daily fees) at `daysElapsed` days. */
  totalInterestKes: number;
  /** Days elapsed used for the projection. */
  daysElapsed: number;
  /**
   * Estimated number of additional days until payoff, given `dailyRepaymentKes`.
   * Null when `dailyRepaymentKes` is zero or less than the daily fee (loan grows
   * indefinitely — never paid off at this rate).
   */
  estimatedDaysToPayoff: number | null;
  /** ISO date string of the estimated payoff date. Null when unresolvable. */
  estimatedPayoffDate: string | null;
  /** Day-by-day outstanding balance for the payoff schedule (max 365 entries). */
  schedule: ProjectionPoint[];
}

/**
 * Project a Fuliza loan's cost and repayment timeline.
 *
 * @param principalKes     Original draw amount in KES.
 * @param alreadyRepaidKes Amount already repaid (reduces outstanding).
 * @param drawDateIso      ISO date string of when the loan was drawn.
 * @param asOfDateIso      ISO date string to project from (defaults to today).
 * @param dailyRepaymentKes Assumed daily repayment amount for payoff projection.
 */
export function projectFuliza(
  principalKes: number,
  alreadyRepaidKes: number,
  drawDateIso: string,
  asOfDateIso?: string,
  dailyRepaymentKes = 0,
): FulizaProjection {
  const drawDate = new Date(drawDateIso);
  const asOf = asOfDateIso ? new Date(asOfDateIso) : new Date();

  // Days elapsed since draw, floored to whole days.
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.max(0, Math.floor((asOf.getTime() - drawDate.getTime()) / msPerDay));

  const accessFeeKes = accessFeeForAmount(principalKes);
  const dailyFeeKes = dailyFeeForAmount(principalKes);

  // Total interest = once-off access fee + daily fee × days elapsed.
  const totalInterestKes = accessFeeKes + dailyFeeKes * daysElapsed;
  const totalOwedKes = Math.max(0, principalKes + totalInterestKes - alreadyRepaidKes);

  // Payoff projection: simulate day-by-day from today.
  let outstanding = totalOwedKes;
  const schedule: ProjectionPoint[] = [{ day: 0, outstandingKes: outstanding, totalInterestKes }];
  let estimatedDaysToPayoff: number | null = null;

  if (dailyRepaymentKes > dailyFeeKes && outstanding > 0) {
    const netRepayment = dailyRepaymentKes - dailyFeeKes;
    // Simple linear estimate for early exit check.
    const maxSimDays = Math.min(365, Math.ceil(outstanding / netRepayment) + 1);

    for (let d = 1; d <= maxSimDays; d++) {
      outstanding = Math.max(0, outstanding + dailyFeeKes - dailyRepaymentKes);
      schedule.push({
        day: d,
        outstandingKes: outstanding,
        totalInterestKes: totalInterestKes + dailyFeeKes * d,
      });
      if (outstanding === 0) {
        estimatedDaysToPayoff = d;
        break;
      }
    }
  }

  let estimatedPayoffDate: string | null = null;
  if (estimatedDaysToPayoff !== null) {
    const payoffDate = new Date(asOf.getTime() + estimatedDaysToPayoff * msPerDay);
    estimatedPayoffDate = payoffDate.toISOString().split('T')[0];
  }

  return {
    principalKes,
    accessFeeKes,
    dailyFeeKes,
    totalOwedKes,
    totalInterestKes,
    daysElapsed,
    estimatedDaysToPayoff,
    estimatedPayoffDate,
    schedule,
  };
}

/**
 * Format a KES amount for display.
 * Keeps this util self-contained — doesn't depend on formatCurrency from
 * the app's formatter module.
 */
export function formatKes(amount: number): string {
  return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
