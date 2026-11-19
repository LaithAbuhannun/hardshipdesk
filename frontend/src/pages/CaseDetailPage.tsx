import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Grid2 as Grid, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useGetCaseQuery } from '../api/hardshipApi';
import type { CaseDetail } from '../api/types';
import { CaseActionDialog, type ActionKind } from '../components/CaseActionDialog';
import { RiskChip, statusLabel } from '../components/RiskChip';
import { daysBetween, describeDaysRemaining, formatDate } from '../lib/dates';

const eventLabels: Record<string, string> = {
  HardshipNoticeReceived: 'Hardship notice received',
  InformationRequested: 'Information requested',
  InformationReceived: 'Information received',
  ResponseApproved: 'Arrangement approved',
  ResponseDeclined: 'Request declined',
  VariationNoticeSent: 'Written variation notice sent',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography>{value}</Typography>
    </Box>
  );
}

function ClockCard({ c }: { c: CaseDetail }) {
  const startDate = c.infoReceivedDate ?? c.infoRequestedDate ?? c.receivedDate;
  const total = Math.max(1, daysBetween(startDate, c.responseDueDate));
  const used = Math.min(total, Math.max(0, total - c.daysRemaining));
  const responded = !!c.respondedDate;
  const color = c.riskLevel === 'Overdue' || c.riskLevel === 'Breached' ? 'error' : c.riskLevel === 'Critical' || c.riskLevel === 'Warning' ? 'warning' : 'success';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Statutory clock</Typography>
          <RiskChip level={c.riskLevel} size="medium" />
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>{formatDate(c.responseDueDate)}</Typography>
        <Typography color="text.secondary">Decision due · {describeDaysRemaining(c.daysRemaining, responded)}</Typography>
        <LinearProgress variant="determinate" value={(used / total) * 100} color={color} sx={{ height: 8, borderRadius: 4, my: 2 }} />
        <Typography variant="body2">Rule applied: <b>{c.ruleApplied}</b> (National Credit Code s72).</Typography>
        {!c.infoRequestedDate && !responded && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Information can be requested until {formatDate(c.infoRequestDeadline)}.
          </Typography>
        )}
        {c.variationNoticeDueDate && (
          <Alert severity={c.variationNoticeSentDate ? 'success' : 'warning'} sx={{ mt: 2 }}>
            {c.variationNoticeSentDate
              ? `Written variation notice sent ${formatDate(c.variationNoticeSentDate)}.`
              : `Arrangement is over 90 days: written variation notice due by ${formatDate(c.variationNoticeDueDate)}.`}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function CaseDetailPage() {
  const id = Number(useParams().id);
  const { data, isLoading, error } = useGetCaseQuery(id);
  const [action, setAction] = useState<ActionKind | null>(null);

  if (isLoading) return <CircularProgress />;
  if (error || !data) return <Alert severity="error">Case not found.</Alert>;

  const c = data.case;
  const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(c.balance);

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/cases" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start' }}>All cases</Button>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{c.caseReference} · {c.customerName}</Typography>
        <Typography color="text.secondary">{c.productType} {c.contractNumber} · {statusLabel(c.status)}</Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {c.status === 'Open' && <Button variant="outlined" onClick={() => setAction('request-information')}>Request information</Button>}
        {c.status === 'InfoRequested' && <Button variant="outlined" onClick={() => setAction('information-received')}>Information received</Button>}
        {c.status !== 'Responded' && <Button variant="contained" onClick={() => setAction('response')}>Record decision</Button>}
        {c.variationNoticeDueDate && !c.variationNoticeSentDate && <Button variant="contained" color="warning" onClick={() => setAction('variation-notice')}>Variation notice sent</Button>}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><ClockCard c={c} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Details</Typography>
              <Grid container spacing={2}>
                <Grid size={6}><Field label="Received" value={`${formatDate(c.receivedDate)} via ${c.channel}`} /></Grid>
                <Grid size={6}><Field label="Balance" value={money} /></Grid>
                <Grid size={6}><Field label="Email" value={c.customerEmail} /></Grid>
                <Grid size={6}><Field label="Owner" value={c.assignedTo ?? 'Unassigned'} /></Grid>
                {c.outcome && <Grid size={6}><Field label="Decision" value={`${c.outcome}${c.arrangementDays ? ` · ${c.arrangementDays} days` : ''}`} /></Grid>}
                <Grid size={12}><Field label="What the customer told us" value={c.reason} /></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Audit trail</Typography>
          <Stack divider={<Divider />} spacing={1}>
            {data.events.map((e) => (
              <Box key={e.eventId}>
                <Typography sx={{ fontWeight: 600 }}>{eventLabels[e.eventType] ?? e.eventType}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(e.occurredAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} · {e.actor}{e.detail ? ` · ${e.detail}` : ''}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <CaseActionDialog kind={action} detail={c} onClose={() => setAction(null)} />
    </Stack>
  );
}
