import { describe, expect, it } from 'vitest';
import { calculateClock, classifyRisk, variationNoticeDueDate } from './statutoryClock';

const received = '2026-11-02';

describe('statutory clock (demo mode mirror of the .NET rules)', () => {
  it('gives 21 days from the notice when no information is requested', () => {
    const r = calculateClock({ receivedDate: received, infoRequestedDate: null, infoReceivedDate: null, respondedDate: null }, received);
    expect(r.responseDueDate).toBe('2026-11-23');
    expect(r.daysRemaining).toBe(21);
  });

  it('restarts the 21-day clock when requested information arrives', () => {
    const r = calculateClock({ receivedDate: received, infoRequestedDate: '2026-11-07', infoReceivedDate: '2026-11-14', respondedDate: null }, '2026-11-14');
    expect(r.responseDueDate).toBe('2026-12-05');
  });

  it('allows 28 days from the request when information never arrives', () => {
    const r = calculateClock({ receivedDate: received, infoRequestedDate: '2026-11-07', infoReceivedDate: null, respondedDate: null }, '2026-11-07');
    expect(r.responseDueDate).toBe('2026-12-05');
  });

  it('marks a late response as a breach', () => {
    const r = calculateClock({ receivedDate: received, infoRequestedDate: null, infoReceivedDate: null, respondedDate: '2026-11-24' }, '2027-01-01');
    expect(r.riskLevel).toBe('Breached');
  });

  it.each([
    [8, 'OnTrack'],
    [7, 'Warning'],
    [3, 'Critical'],
    [0, 'Critical'],
    [-1, 'Overdue'],
  ] as const)('classifies %i days remaining as %s', (days, expected) => {
    expect(classifyRisk(null, days)).toBe(expected);
  });

  it('only needs a variation notice for arrangements over 90 days', () => {
    expect(variationNoticeDueDate('Approved', 90, '2026-11-10')).toBeNull();
    expect(variationNoticeDueDate('Approved', 91, '2026-11-10')).toBe('2026-12-10');
    expect(variationNoticeDueDate('Declined', 180, '2026-11-10')).toBeNull();
  });
});
