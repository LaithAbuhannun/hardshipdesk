export type CaseStatus = 'Open' | 'InfoRequested' | 'InfoReceived' | 'Responded';
export type RiskLevel = 'OnTrack' | 'Warning' | 'Critical' | 'Overdue' | 'Met' | 'Breached';
export type ProductType = 'Home Loan' | 'Personal Loan' | 'Car Loan' | 'Credit Card' | 'BNPL';
export type Channel = 'Phone' | 'Email' | 'Web' | 'Branch' | 'Broker';

/** Dates come back from the API as ISO strings; only the YYYY-MM-DD part matters. */
export type IsoDate = string;

export interface CaseSummary {
  caseId: number;
  caseReference: string;
  customerName: string;
  contractNumber: string;
  productType: ProductType;
  channel: Channel;
  status: CaseStatus;
  receivedDate: IsoDate;
  infoRequestedDate: IsoDate | null;
  infoReceivedDate: IsoDate | null;
  respondedDate: IsoDate | null;
  outcome: 'Approved' | 'Declined' | null;
  responseDueDate: IsoDate;
  daysRemaining: number;
  riskLevel: RiskLevel;
  assignedTo: string | null;
}

export interface CaseDetail extends CaseSummary {
  customerEmail: string;
  balance: number;
  reason: string;
  arrangementDays: number | null;
  variationNoticeSentDate: IsoDate | null;
  infoRequestDeadline: IsoDate;
  ruleApplied: string;
  variationNoticeDueDate: IsoDate | null;
}

export interface CaseEvent {
  eventId: number;
  eventType: string;
  detail: string | null;
  actor: string;
  occurredAt: string;
}

export interface CaseDetailResponse {
  case: CaseDetail;
  events: CaseEvent[];
}

export interface Dashboard {
  openCases: number;
  overdue: number;
  critical: number;
  warning: number;
  awaitingCustomer: number;
  variationNoticesPending: number;
  respondedLast90Days: number;
  onTimeLast90Days: number;
  avgDaysToRespond: number | null;
  onTimeRate: number | null;
}

export interface Alert {
  alertId: number;
  caseId: number;
  caseReference: string;
  customerName: string;
  alertType: 'ResponseDue' | 'VariationNoticeDue';
  riskLevel: 'Critical' | 'Overdue';
  dueDate: IsoDate;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  assignedTo: string | null;
}

export interface CaseFilters {
  status?: CaseStatus;
  risk?: RiskLevel;
  search?: string;
}

export interface CreateCaseRequest {
  fullName: string;
  email: string;
  phone?: string;
  contractNumber: string;
  productType: ProductType;
  balance: number;
  channel: Channel;
  reason: string;
  receivedDate: IsoDate;
  assignedTo?: string;
}

export type CaseAction =
  | { kind: 'request-information'; body: { requestDate: IsoDate; details: string } }
  | { kind: 'information-received'; body: { receivedDate: IsoDate } }
  | { kind: 'response'; body: { respondedDate: IsoDate; outcome: 'Approved' | 'Declined'; arrangementDays?: number; notes?: string } }
  | { kind: 'variation-notice'; body: { sentDate: IsoDate } };
