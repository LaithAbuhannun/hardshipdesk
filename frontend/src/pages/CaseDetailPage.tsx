import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useGetCaseQuery } from '../api/hardshipApi';
import type { CaseDetail } from '../api/types';
import { CaseActionDialog, type ActionKind } from '../components/CaseActionDialog';
import { RiskChip, statusLabel } from '../components/RiskChip';
import { Owner } from '../components/OwnerAvatar';
import { addDays, daysBetween, describeDaysRemaining, formatDate, todaySydney } from '../lib/dates';
import { ink, riskColor } from '../theme';

const panel = { bgcolor: ink.surface, border: `1px solid ${ink.line}`, borderRadius: '16px', p: { xs: 2, md: 3 } };

const eventLabels: Record<string, string> = {
  HardshipNoticeReceived: 'Hardship notice received',
  InformationRequested: 'Information requested',
  InformationReceived: 'Information received',
  ResponseApproved: 'Arrangement approved',
  ResponseDeclined: 'Request declined',
  VariationNoticeSent: 'Written variation notice sent',
};

/** The s72 process drawn to scale: what happened, today, and when the decision is due. */
function ClockTimeline({ c }: { c: CaseDetail }) {
  const today = todaySydney();
  const end = [c.responseDueDate, c.respondedDate ?? today, today].sort().at(-1)!;
  const span = Math.max(1, daysBetween(c.receivedDate, addDays(end, 1)));
  const pct = (d: string) => (daysBetween(c.receivedDate, d) / span) * 100;
  const color = riskColor[c.riskLevel];

  const raw = [
    { date: c.receivedDate, label: 'Notice received', due: false },
    c.infoRequestedDate && { date: c.infoRequestedDate, label: 'Info requested', due: false },
    c.infoReceivedDate && { date: c.infoReceivedDate, label: 'Info received', due: false },
    c.respondedDate && { date: c.respondedDate, label: 'Decision sent', due: false },
    { date: c.responseDueDate, label: 'Decision due', due: true },
  ].filter(Boolean) as { date: string; label: string; due: boolean }[];
  raw.sort((a, b) => (a.date === b.date ? Number(a.due) - Number(b.due) : a.date < b.date ? -1 : 1));

  // Put a label above the line when it would collide with the previous label below it.
  let lastBelow = -100;
  let lastAbove = -100;
  const marks = raw.map((m) => {
    const at = pct(m.date);
    const above = at - lastBelow < 16 && at - lastAbove >= 16;
    if (above) lastAbove = at; else lastBelow = at;
    return { ...m, at, above };
  });

  const align = (at: number) => (at < 8 ? { left: `${at}%`, transform: 'translateX(-6px)', textAlign: 'left' as const }
    : at > 92 ? { right: `${100 - at}%`, transform: 'translateX(6px)', textAlign: 'right' as const }
    : { left: `${at}%`, transform: 'translateX(-50%)', textAlign: 'center' as const });

  return (
    <Box sx={{ position: 'relative', height: 120, mt: 2, mx: 1 }} role="img"
      aria-label={`Timeline: ${raw.map((m) => `${m.label} ${formatDate(m.date)}`).join(', ')}`}>
      <Box sx={{ position: 'absolute', left: 0, right: 0, top: 52, height: 6, borderRadius: '16px', bgcolor: ink.line }} />
      <Box sx={{ position: 'absolute', left: 0, width: `${Math.min(100, pct(c.respondedDate ?? today))}%`, top: 52, height: 6, borderRadius: '16px', bgcolor: color }} />
      {!c.respondedDate && (
        <>
          <Box sx={{ position: 'absolute', left: `${pct(today)}%`, top: 40, height: 30, width: 2, bgcolor: ink.text }} />
        </>
      )}
      {marks.map((m) => (
        <Box key={m.label}>
          {m.due
            ? <Box sx={{ position: 'absolute', left: `calc(${m.at}% - 1.5px)`, top: 42, width: 3, height: 26, bgcolor: color, borderRadius: 1 }} />
            : <Box sx={{ position: 'absolute', left: `calc(${m.at}% - 7px)`, top: 48, width: 14, height: 14, borderRadius: '50%', bgcolor: ink.surface, border: `3px solid ${color}` }} />}
          <Box sx={{ position: 'absolute', ...(m.above ? { bottom: 84 } : { top: 76 }), ...align(m.at), whiteSpace: 'nowrap' }}>
            <Typography variant="body2" sx={{ fontSize: 12.5, color: m.due ? color : ink.muted, fontWeight: m.due ? 600 : 400 }}>{m.label}</Typography>
            <Typography variant="body2" sx={{ fontSize: 12.5, fontWeight: m.due ? 600 : 500 }}>{formatDate(m.date)}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ color: ink.muted }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 14.5 }}>{children}</Typography>
    </Box>
  );
}

export function CaseDetailPage() {
  const id = Number(useParams().id);
  const { data, isLoading, error } = useGetCaseQuery(id);
  const [action, setAction] = useState<ActionKind | null>(null);

  if (isLoading) return <CircularProgress />;
  if (error || !data) return <Alert severity="error">We couldn’t find case {id}. Go back to all cases and pick another.</Alert>;

  const c = data.case;
  const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(c.balance);
  const responded = !!c.respondedDate;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Button component={RouterLink} to="/cases" startIcon={<ArrowBackIcon />} sx={{ justifySelf: 'start', ml: -1.5, color: ink.muted }}>All cases</Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h1">{c.customerName}</Typography>
          <Typography sx={{ color: ink.muted }}>{c.caseReference}, {c.productType} {c.contractNumber}, {statusLabel(c.status).toLowerCase()}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {c.status === 'Open' && <Button variant="outlined" onClick={() => setAction('request-information')}>Request information</Button>}
          {c.status === 'InfoRequested' && <Button variant="outlined" onClick={() => setAction('information-received')}>Mark information received</Button>}
          {c.variationNoticeDueDate && !c.variationNoticeSentDate && <Button variant="outlined" color="warning" onClick={() => setAction('variation-notice')}>Mark variation notice sent</Button>}
          {!responded && <Button variant="contained" onClick={() => setAction('response')}>Record decision</Button>}
        </Box>
      </Box>

      <Box sx={panel}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: responded ? ink.text : riskColor[c.riskLevel] }}>
              {describeDaysRemaining(c.daysRemaining, responded)}
            </Typography>
            <Typography sx={{ color: ink.muted, mt: 0.5 }}>Decision due {c.ruleApplied}.</Typography>
          </Box>
          <RiskChip level={c.riskLevel} />
        </Box>
        <ClockTimeline c={c} />
        {!c.infoRequestedDate && !responded && (
          <Typography variant="body2" sx={{ color: ink.muted, mt: 1 }}>You can still ask for more information until {formatDate(c.infoRequestDeadline)}.</Typography>
        )}
        {c.variationNoticeDueDate && (
          <Alert severity={c.variationNoticeSentDate ? 'success' : 'warning'} sx={{ mt: 2 }}>
            {c.variationNoticeSentDate
              ? `Written variation notice sent ${formatDate(c.variationNoticeSentDate)}.`
              : `This arrangement is longer than 90 days, so a written variation notice is due by ${formatDate(c.variationNoticeDueDate)}.`}
          </Alert>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
        <Box sx={panel}>
          <Typography variant="h2" sx={{ mb: 2 }}>Request</Typography>
          <Typography sx={{ fontSize: 16, lineHeight: 1.6, mb: 2.5, maxWidth: '60ch' }}>“{c.reason}”</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Field label="Received">{formatDate(c.receivedDate)} by {c.channel.toLowerCase()}</Field>
            <Field label="Balance">{money}</Field>
            <Field label="Email">{c.customerEmail}</Field>
            <Field label="Owner"><Owner name={c.assignedTo} /></Field>
            {c.outcome && <Field label="Decision">{c.outcome}{c.arrangementDays ? `, ${c.arrangementDays}-day arrangement` : ''}</Field>}
          </Box>
        </Box>

        <Box sx={panel}>
          <Typography variant="h2" sx={{ mb: 1 }}>History</Typography>
          {data.events.map((e, i) => (
            <Box key={e.eventId} sx={{ display: 'grid', gridTemplateColumns: '14px 1fr', columnGap: 1.5 }}>
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: 4, top: 8, width: 6, height: 6, borderRadius: '50%', bgcolor: ink.brand }} />
                {i < data.events.length - 1 && <Box sx={{ position: 'absolute', left: 6.5, top: 18, bottom: -6, width: '1px', bgcolor: ink.line }} />}
              </Box>
              <Box sx={{ pb: 2 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{eventLabels[e.eventType] ?? e.eventType}</Typography>
                <Typography variant="body2" sx={{ color: ink.muted }}>
                  {new Date(e.occurredAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} by {e.actor}
                </Typography>
                {e.detail && <Typography variant="body2" sx={{ mt: 0.5 }}>{e.detail}</Typography>}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <CaseActionDialog kind={action} detail={c} onClose={() => setAction(null)} />
    </Box>
  );
}
