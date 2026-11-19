import type { Alert, CaseDetail, CaseEvent, CaseSummary, CreateCaseRequest, Dashboard, IsoDate } from './types';
import { addDays, daysBetween, todaySydney } from '../lib/dates';
import { calculateClock, variationNoticeDueDate } from '../lib/statutoryClock';

/**
 * In-browser stand-in for the .NET API so the UI can be demoed (e.g. on GitHub Pages)
 * without SQL Server. It mirrors the stored procedures' behaviour, including their rule errors.
 */

interface StoredCase {
  caseId: number;
  customerName: string;
  customerEmail: string;
  contractNumber: string;
  productType: CaseDetail['productType'];
  balance: number;
  channel: CaseDetail['channel'];
  reason: string;
  status: CaseDetail['status'];
  receivedDate: IsoDate;
  infoRequestedDate: IsoDate | null;
  infoReceivedDate: IsoDate | null;
  respondedDate: IsoDate | null;
  outcome: CaseDetail['outcome'];
  arrangementDays: number | null;
  variationNoticeSentDate: IsoDate | null;
  assignedTo: string | null;
}

export class DemoError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const today = () => todaySydney();
const d = (offset: number) => addDays(today(), offset);

let nextCaseId = 1;
let nextEventId = 1;
let nextAlertId = 1;
const cases: StoredCase[] = [];
const events: (CaseEvent & { caseId: number })[] = [];
const alerts: Alert[] = [];

function log(caseId: number, eventType: string, detail: string, actor = 'demo.user', at = new Date().toISOString()) {
  events.push({ eventId: nextEventId++, caseId, eventType, detail, actor, occurredAt: at });
}

function seed() {
  const rows: Omit<StoredCase, 'caseId'>[] = [
    { customerName: 'Priya Sharma', customerEmail: 'priya.sharma@example.com', contractNumber: 'HL-204118', productType: 'Home Loan', balance: 612400, channel: 'Phone', reason: 'Made redundant last month; partner on reduced hours.', status: 'Open', receivedDate: d(-19), infoRequestedDate: null, infoReceivedDate: null, respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null, assignedTo: 'Jess Walker' },
    { customerName: 'Daniel Okafor', customerEmail: 'daniel.okafor@example.com', contractNumber: 'PL-330921', productType: 'Personal Loan', balance: 18250, channel: 'Email', reason: 'Medical leave for surgery, expected back at work in 8 weeks.', status: 'Open', receivedDate: d(-23), infoRequestedDate: null, infoReceivedDate: null, respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null, assignedTo: 'Omar Haddad' },
    { customerName: 'Mei Lin Chen', customerEmail: 'meilin.chen@example.com', contractNumber: 'CC-778213', productType: 'Credit Card', balance: 7340.55, channel: 'Web', reason: 'Hours cut at work, asking to pause repayments for 3 months.', status: 'InfoRequested', receivedDate: d(-10), infoRequestedDate: d(-8), infoReceivedDate: null, respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null, assignedTo: 'Jess Walker' },
    { customerName: 'Tom Gallagher', customerEmail: 'tom.gallagher@example.com', contractNumber: 'CL-119044', productType: 'Car Loan', balance: 29800, channel: 'Broker', reason: 'Small business income down after flooding.', status: 'InfoRequested', receivedDate: d(-30), infoRequestedDate: d(-25), infoReceivedDate: null, respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null, assignedTo: 'Omar Haddad' },
    { customerName: 'Aisha Rahman', customerEmail: 'aisha.rahman@example.com', contractNumber: 'HL-205562', productType: 'Home Loan', balance: 488900, channel: 'Branch', reason: 'Separation; now on a single income with two children.', status: 'InfoReceived', receivedDate: d(-16), infoRequestedDate: d(-14), infoReceivedDate: d(-4), respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null, assignedTo: 'Jess Walker' },
    { customerName: 'Lucas Moreau', customerEmail: 'lucas.moreau@example.com', contractNumber: 'BN-901337', productType: 'BNPL', balance: 960, channel: 'Web', reason: 'Unexpected car repair bill; asking for a short payment holiday.', status: 'Open', receivedDate: d(-3), infoRequestedDate: null, infoReceivedDate: null, respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null, assignedTo: null },
    { customerName: 'Sarah Nguyen', customerEmail: 'sarah.nguyen@example.com', contractNumber: 'PL-331478', productType: 'Personal Loan', balance: 11420, channel: 'Phone', reason: 'Lost casual job; needs reduced repayments for 6 months.', status: 'Responded', receivedDate: d(-60), infoRequestedDate: null, infoReceivedDate: null, respondedDate: d(-45), outcome: 'Approved', arrangementDays: 180, variationNoticeSentDate: null, assignedTo: 'Omar Haddad' },
    { customerName: 'Jack Thompson', customerEmail: 'jack.thompson@example.com', contractNumber: 'HL-206003', productType: 'Home Loan', balance: 731050, channel: 'Email', reason: 'Interest rate rises; asked to extend loan term.', status: 'Responded', receivedDate: d(-50), infoRequestedDate: d(-40), infoReceivedDate: d(-35), respondedDate: d(-12), outcome: 'Declined', arrangementDays: null, variationNoticeSentDate: null, assignedTo: 'Jess Walker' },
  ];
  for (const r of rows) {
    const c = { ...r, caseId: nextCaseId++ };
    cases.push(c);
    log(c.caseId, 'HardshipNoticeReceived', `Received via ${c.channel} on ${c.receivedDate}`, 'seed', `${c.receivedDate}T09:00:00Z`);
    if (c.infoRequestedDate) log(c.caseId, 'InformationRequested', 'Requested last 3 payslips and a household budget.', c.assignedTo ?? 'seed', `${c.infoRequestedDate}T10:00:00Z`);
    if (c.infoReceivedDate) log(c.caseId, 'InformationReceived', `Customer provided information on ${c.infoReceivedDate}`, 'seed', `${c.infoReceivedDate}T11:00:00Z`);
    if (c.respondedDate) log(c.caseId, `Response${c.outcome}`, c.outcome === 'Approved' ? `${c.arrangementDays}-day arrangement.` : 'Proposed term extension not affordable on current income.', c.assignedTo ?? 'seed', `${c.respondedDate}T14:00:00Z`);
  }
  runDeadlineMonitor();
}

function reference(id: number) {
  return `HD-${String(id).padStart(5, '0')}`;
}

function toDetail(c: StoredCase): CaseDetail {
  const clock = calculateClock(c, today());
  return {
    ...c,
    caseReference: reference(c.caseId),
    ...clock,
    variationNoticeDueDate: variationNoticeDueDate(c.outcome, c.arrangementDays, c.respondedDate),
  };
}

function find(id: number) {
  const c = cases.find((x) => x.caseId === id);
  if (!c) throw new DemoError(404, 'Case not found.');
  return c;
}

function runDeadlineMonitor(): number {
  let created = 0;
  for (const k of cases.map(toDetail)) {
    const candidates: Pick<Alert, 'alertType' | 'riskLevel' | 'dueDate'>[] = [];
    if (k.riskLevel === 'Critical' || k.riskLevel === 'Overdue') {
      candidates.push({ alertType: 'ResponseDue', riskLevel: k.riskLevel, dueDate: k.responseDueDate });
    }
    if (k.variationNoticeDueDate && !k.variationNoticeSentDate && daysBetween(today(), k.variationNoticeDueDate) <= 5) {
      candidates.push({ alertType: 'VariationNoticeDue', riskLevel: k.variationNoticeDueDate < today() ? 'Overdue' : 'Critical', dueDate: k.variationNoticeDueDate });
    }
    for (const a of candidates) {
      const exists = alerts.some((x) => x.caseId === k.caseId && x.alertType === a.alertType && x.dueDate === a.dueDate && x.riskLevel === a.riskLevel);
      if (exists) continue;
      alerts.push({ ...a, alertId: nextAlertId++, caseId: k.caseId, caseReference: k.caseReference, customerName: k.customerName, createdAt: new Date().toISOString(), acknowledgedAt: null, acknowledgedBy: null, assignedTo: k.assignedTo });
      created++;
    }
  }
  return created;
}

function summaries(params: URLSearchParams): CaseSummary[] {
  const status = params.get('status');
  const risk = params.get('risk');
  const search = params.get('search')?.toLowerCase();
  return cases
    .map(toDetail)
    .filter((c) => (!status || c.status === status) && (!risk || c.riskLevel === risk))
    .filter((c) => !search || [c.customerName, c.caseReference, c.contractNumber].some((v) => v.toLowerCase().includes(search)))
    .sort((a, b) => Number(!!a.respondedDate) - Number(!!b.respondedDate) || a.daysRemaining - b.daysRemaining);
}

function dashboard(): Dashboard {
  const all = cases.map(toDetail);
  const cutoff = d(-90);
  const recent = all.filter((c) => c.respondedDate && c.respondedDate >= cutoff);
  const responded = all.filter((c) => c.respondedDate);
  const onTime = recent.filter((c) => c.riskLevel === 'Met').length;
  return {
    openCases: all.filter((c) => !c.respondedDate).length,
    overdue: all.filter((c) => c.riskLevel === 'Overdue').length,
    critical: all.filter((c) => c.riskLevel === 'Critical').length,
    warning: all.filter((c) => c.riskLevel === 'Warning').length,
    awaitingCustomer: all.filter((c) => c.status === 'InfoRequested').length,
    variationNoticesPending: all.filter((c) => c.variationNoticeDueDate && !c.variationNoticeSentDate).length,
    respondedLast90Days: recent.length,
    onTimeLast90Days: onTime,
    avgDaysToRespond: responded.length ? Math.round((10 * responded.reduce((s, c) => s + daysBetween(c.receivedDate, c.respondedDate!), 0)) / responded.length) / 10 : null,
    onTimeRate: recent.length ? Math.round((1000 * onTime) / recent.length) / 10 : null,
  };
}

function createCase(r: CreateCaseRequest): { caseId: number } {
  if (r.receivedDate > today()) throw new DemoError(400, 'The received date cannot be in the future.');
  const existing = cases.find((c) => c.contractNumber === r.contractNumber);
  if (existing && existing.customerEmail !== r.email.toLowerCase()) throw new DemoError(409, 'That contract number belongs to a different customer.');
  const c: StoredCase = {
    caseId: nextCaseId++, customerName: r.fullName, customerEmail: r.email.toLowerCase(), contractNumber: r.contractNumber,
    productType: r.productType, balance: r.balance, channel: r.channel, reason: r.reason, status: 'Open', receivedDate: r.receivedDate,
    infoRequestedDate: null, infoReceivedDate: null, respondedDate: null, outcome: null, arrangementDays: null, variationNoticeSentDate: null,
    assignedTo: r.assignedTo || null,
  };
  cases.push(c);
  log(c.caseId, 'HardshipNoticeReceived', `Received via ${c.channel} on ${c.receivedDate}`);
  return { caseId: c.caseId };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyAction(id: number, action: string, body: any) {
  const c = find(id);
  switch (action) {
    case 'request-information':
      if (c.status !== 'Open') throw new DemoError(409, 'Information can only be requested on an open case.');
      if (body.requestDate < c.receivedDate) throw new DemoError(400, 'The request date cannot be before the hardship notice was received.');
      if (body.requestDate > addDays(c.receivedDate, 21)) throw new DemoError(400, 'Information must be requested within 21 days of receiving the hardship notice (NCC s72).');
      Object.assign(c, { status: 'InfoRequested', infoRequestedDate: body.requestDate });
      log(id, 'InformationRequested', body.details);
      break;
    case 'information-received':
      if (c.status !== 'InfoRequested') throw new DemoError(409, 'No outstanding information request on this case.');
      if (body.receivedDate < c.infoRequestedDate!) throw new DemoError(409, 'Information cannot be received before it was requested.');
      Object.assign(c, { status: 'InfoReceived', infoReceivedDate: body.receivedDate });
      log(id, 'InformationReceived', `Customer provided information on ${body.receivedDate}`);
      break;
    case 'response':
      if (c.status === 'Responded') throw new DemoError(409, 'A response has already been recorded for this case.');
      if (body.respondedDate < c.receivedDate) throw new DemoError(409, 'The response date cannot be before the hardship notice was received.');
      if (body.outcome === 'Approved' && !body.arrangementDays) throw new DemoError(400, 'Enter how many days the arrangement lasts.');
      Object.assign(c, { status: 'Responded', respondedDate: body.respondedDate, outcome: body.outcome, arrangementDays: body.outcome === 'Approved' ? body.arrangementDays : null });
      log(id, `Response${body.outcome}`, [body.outcome === 'Approved' ? `${body.arrangementDays}-day arrangement.` : '', body.notes ?? ''].join(' ').trim());
      break;
    case 'variation-notice':
      if (!(c.outcome === 'Approved' && (c.arrangementDays ?? 0) > 90)) throw new DemoError(409, 'A written variation notice is only tracked for approved arrangements longer than 90 days.');
      c.variationNoticeSentDate = body.sentDate;
      log(id, 'VariationNoticeSent', `Written variation notice sent on ${body.sentDate}`);
      break;
    default:
      throw new DemoError(404, 'Unknown action.');
  }
}

/** Routes a request the same way the ASP.NET controllers do. */
export async function demoFetch(method: string, url: string, body?: unknown): Promise<unknown> {
  if (!cases.length) seed();
  await new Promise((r) => setTimeout(r, 150));
  const u = new URL(url, 'http://demo');
  const path = u.pathname.replace(/^\/api/, '');
  let m: RegExpMatchArray | null;

  if (method === 'GET' && path === '/dashboard') return dashboard();
  if (method === 'GET' && path === '/alerts') return alerts.filter((a) => u.searchParams.get('includeAcknowledged') === 'true' || !a.acknowledgedAt);
  if (method === 'POST' && (m = path.match(/^\/alerts\/(\d+)\/acknowledge$/))) {
    const a = alerts.find((x) => x.alertId === Number(m![1]) && !x.acknowledgedAt);
    if (!a) throw new DemoError(404, 'Alert not found or already acknowledged.');
    Object.assign(a, { acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'demo.user' });
    return null;
  }
  if (method === 'POST' && path === '/jobs/deadline-monitor') return { created: runDeadlineMonitor() };
  if (method === 'GET' && path === '/cases') return summaries(u.searchParams);
  if (method === 'POST' && path === '/cases') return createCase(body as CreateCaseRequest);
  if (method === 'GET' && (m = path.match(/^\/cases\/(\d+)$/))) {
    const id = Number(m[1]);
    return { case: toDetail(find(id)), events: events.filter((e) => e.caseId === id) };
  }
  if (method === 'POST' && (m = path.match(/^\/cases\/(\d+)\/([a-z-]+)$/))) {
    applyAction(Number(m[1]), m[2], body);
    return null;
  }
  throw new DemoError(404, `No demo route for ${method} ${path}`);
}
