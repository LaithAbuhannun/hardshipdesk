import type { IsoDate, RiskLevel } from '../api/types';
import { addDays, daysBetween } from './dates';

/**
 * Same National Credit Code s72 rules as dbo.tvf_CaseClock and StatutoryClock.cs.
 * Used only by the offline demo mode so the UI can run without the .NET API.
 */
export interface ClockInput {
  receivedDate: IsoDate;
  infoRequestedDate: IsoDate | null;
  infoReceivedDate: IsoDate | null;
  respondedDate: IsoDate | null;
}

export function calculateClock(c: ClockInput, today: IsoDate) {
  let responseDueDate: IsoDate;
  let ruleApplied: string;

  if (!c.infoRequestedDate) {
    responseDueDate = addDays(c.receivedDate, 21);
    ruleApplied = '21 days after the hardship notice was received';
  } else if (c.infoReceivedDate) {
    responseDueDate = addDays(c.infoReceivedDate, 21);
    ruleApplied = '21 days after the requested information was received';
  } else {
    responseDueDate = addDays(c.infoRequestedDate, 28);
    ruleApplied = '28 days after information was requested (not yet received)';
  }

  const daysRemaining = daysBetween(c.respondedDate ?? today, responseDueDate);
  return {
    infoRequestDeadline: addDays(c.receivedDate, 21),
    responseDueDate,
    ruleApplied,
    daysRemaining,
    riskLevel: classifyRisk(c.respondedDate, daysRemaining),
  };
}

export function classifyRisk(respondedDate: IsoDate | null, daysRemaining: number): RiskLevel {
  if (respondedDate) return daysRemaining >= 0 ? 'Met' : 'Breached';
  if (daysRemaining < 0) return 'Overdue';
  if (daysRemaining <= 3) return 'Critical';
  if (daysRemaining <= 7) return 'Warning';
  return 'OnTrack';
}

export function variationNoticeDueDate(outcome: string | null, arrangementDays: number | null, agreedDate: IsoDate | null): IsoDate | null {
  return outcome === 'Approved' && arrangementDays != null && arrangementDays > 90 && agreedDate ? addDays(agreedDate, 30) : null;
}
