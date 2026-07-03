import { parseSmsPreviewFallback, isMpesaSmsFallback } from '../fallbackSmsParser';

describe('isMpesaSmsFallback', () => {
  it('accepts M-PESA keyword messages', () => {
    expect(isMpesaSmsFallback('M-PESA XC12345678 Confirmed Ksh200')).toBe(true);
  });

  it('accepts code+amount without keyword', () => {
    expect(isMpesaSmsFallback('AB1234567C sent Ksh500 to someone')).toBe(true);
  });

  it('rejects unrelated SMS', () => {
    expect(isMpesaSmsFallback('Your parcel is ready for pickup.')).toBe(false);
  });
});

describe('parseSmsPreviewFallback', () => {
  it('parses a received payment as income/high/direct', () => {
    const r = parseSmsPreviewFallback(
      'SIE8QWE123 Confirmed. You have received Ksh390.00 from JOHN DOE 0712345678 on 16/3/26 at 11:20 AM. New M-PESA balance is Ksh1,200.00.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mpesaCode).toBe('SIE8QWE123');
    expect(r.amount).toBe(390);
    expect(r.transactionType).toBe('income');
    expect(r.category).toBe('income');
    expect(r.confidence).toBe('high');
    expect(r.parseRoute).toBe('direct');
    expect(r.balanceAfter).toBe(1200);
    expect(r.merchant).toContain('JOHN DOE');
  });

  it('parses sent as transfer', () => {
    const r = parseSmsPreviewFallback(
      'SIE8QWE124 Confirmed. Ksh390.00 sent to JANE DOE 0712345678 on 16/3/26 at 11:22 AM. New M-PESA balance is Ksh810.00.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.transactionType).toBe('transfer');
    expect(r.category).toBe('transfer');
  });

  it('parses paybill as utilities expense', () => {
    const r = parseSmsPreviewFallback(
      'SIE8QWE125 Confirmed. Ksh1,250.00 sent to KPLC PREPAID for account 998877 on 16/3/26 at 11:23 AM. New M-PESA balance is Ksh2,100.00.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.category).toBe('utilities');
    expect(r.transactionType).toBe('expense');
    expect(r.amount).toBe(1250);
  });

  it('parses comma thousands', () => {
    const r = parseSmsPreviewFallback(
      'CD98765432 Confirmed. You have received Ksh85,000.00 from EMPLOYER LTD on 28/2/26 at 8:00 AM. New M-PESA balance is Ksh90,500.00.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.amount).toBe(85000);
    expect(r.balanceAfter).toBe(90500);
  });

  it('missing balance downgrades to medium/review', () => {
    const r = parseSmsPreviewFallback(
      'TR12345678 Confirmed. Ksh300.00 sent to ALICE MUTHONI on 15/6/24.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.confidence).toBe('medium');
    expect(r.parseRoute).toBe('review');
  });

  it('unrecognised M-Pesa message quarantines', () => {
    const r = parseSmsPreviewFallback(
      'ZZ12345678 Confirmed. M-PESA voucher Ksh1,000.00 issued on 15/6/24.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.confidence).toBe('low');
    expect(r.parseRoute).toBe('quarantine');
    expect(r.category).toBe('uncategorized');
  });

  it('rejects non-M-Pesa SMS', () => {
    const r = parseSmsPreviewFallback('Your OTP code is 483920. Do not share it.');
    expect(r).toEqual({ ok: false, reason: 'not_mpesa' });
  });

  it('rejects zero amounts', () => {
    const r = parseSmsPreviewFallback(
      'QZR7AMNT31 Confirmed. You have received Ksh0.00 from NOBODY on 1/7/26. New M-PESA balance is Ksh1,000.00.',
    );
    expect(r.ok).toBe(false);
  });

  it('requires a digit in the transaction code', () => {
    // "Confirmedd" is 10 letters — must NOT be taken as a code.
    const r = parseSmsPreviewFallback('Confirmedd. M-PESA payment of Ksh100.00 done.');
    if (r.ok) {
      // If it parsed, the code must contain a digit (came from elsewhere).
      expect(/\d/.test(r.mpesaCode)).toBe(true);
    } else {
      expect(r.reason).toBe('no_code');
    }
  });

  it('uppercases lowercase codes', () => {
    const r = parseSmsPreviewFallback(
      'sie8qwe12 Confirmed. Ksh100.00 sent to JOHN DOE on 1/7/26. New M-PESA balance is Ksh900.00.',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mpesaCode).toBe('SIE8QWE12');
  });
});
