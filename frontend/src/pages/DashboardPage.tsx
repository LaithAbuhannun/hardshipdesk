import { Box, Button, IconButton, LinearProgress, Skeleton, Tooltip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CURRENT_USER } from '../lib/user';
import { useAcknowledgeAlertMutation, useGetAlertsQuery, useGetCasesQuery, useGetDashboardQuery, useRunDeadlineMonitorMutation } from '../api/hardshipApi';
import type { CaseSummary, Dashboard, RiskLevel } from '../api/types';
import { DeadlineRunway } from '../components/DeadlineRunway';
import { OwnerAvatar } from '../components/OwnerAvatar';
import { formatDate, todaySydney } from '../lib/dates';
import { setFilter, useAppDispatch } from '../store';
import { ink, riskColor, riskTint } from '../theme';

export const panel = { bgcolor: ink.surface, border: `1px solid ${ink.line}`, borderRadius: '16px', p: { xs: 2, md: 3 } };

function headline(s: Dashboard) {
  const parts: string[] = [];
  if (s.overdue) parts.push(`${s.overdue} decision${s.overdue === 1 ? ' is' : 's are'} past the legal deadline`);
  if (s.critical) parts.push(`${s.critical} ${s.critical === 1 ? 'is' : 'are'} due in the next 3 days`);
  if (!parts.length) return 'Every open hardship request is inside its deadline.';
  return `${parts.join(' and ')}.`.replace(/^./, (c) => c.toUpperCase());
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Australia/Sydney' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Kpi({ icon, tone, value, label, foot, onClick }: { icon: ReactNode; tone: string; value: ReactNode; label: string; foot?: ReactNode; onClick?: () => void }) {
  return (
    <Box onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      sx={{ ...panel, p: 2.5, cursor: onClick ? 'pointer' : 'default', transition: 'border-color .15s',
        '&:hover': onClick ? { borderColor: tone } : undefined, '&:focus-visible': { outline: `2px solid ${ink.brand}` } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: `${tone}14`, color: tone }}>{icon}</Box>
        <Typography variant="body2" sx={{ color: ink.muted, fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</Typography>
      {foot && <Box sx={{ mt: 1.5 }}>{foot}</Box>}
    </Box>
  );
}

const stages: { key: RiskLevel[]; label: string; color: string }[] = [
  { key: ['Overdue'], label: 'Late', color: riskColor.Overdue },
  { key: ['Critical'], label: 'Due in 3 days', color: riskColor.Critical },
  { key: ['Warning'], label: 'Due this week', color: riskColor.Warning },
  { key: ['OnTrack'], label: 'On track', color: riskColor.OnTrack },
];

/** Donut of open cases by deadline risk. */
function RiskDonut({ cases }: { cases: CaseSummary[] }) {
  const open = cases.filter((c) => !c.respondedDate);
  const counts = stages.map((s) => open.filter((c) => s.key.includes(c.riskLevel)).length);
  const total = open.length || 1;
  const r = 52;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Box sx={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={stages.map((s, i) => `${s.label}: ${counts[i]}`).join(', ')}>
          <circle cx="66" cy="66" r={r} fill="none" stroke={ink.line} strokeWidth="14" />
          {counts.map((n, i) => {
            const len = (n / total) * C;
            const el = n ? (
              <circle key={i} cx="66" cy="66" r={r} fill="none" stroke={stages[i].color} strokeWidth="14"
                strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 66 66)" />
            ) : null;
            offset += len;
            return el;
          })}
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{open.length}</Typography>
            <Typography variant="body2" sx={{ color: ink.muted, fontSize: 12 }}>open</Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gap: 1, flexGrow: 1 }}>
        {stages.map((s, i) => (
          <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: s.color }} />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>{s.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{counts[i]}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function DashboardPage() {
  const { data: stats } = useGetDashboardQuery();
  const { data: cases } = useGetCasesQuery({});
  const { data: alerts } = useGetAlertsQuery();
  const [acknowledge] = useAcknowledgeAlertMutation();
  const [runMonitor, { isLoading: running }] = useRunDeadlineMonitorMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const today = new Date(`${todaySydney()}T00:00:00Z`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  const show = (risk: RiskLevel) => { dispatch(setFilter({ risk, status: undefined, search: '' })); navigate('/cases'); };
  const all = () => { dispatch(setFilter({ status: undefined, risk: undefined, search: '' })); navigate('/cases'); };
  const mine = (cases ?? []).filter((c) => !c.respondedDate && c.assignedTo === CURRENT_USER).length;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: ink.muted, mb: 0.5 }}>{greeting()}, {CURRENT_USER.split(' ')[0]}. It’s {today}.</Typography>
          {stats ? <Typography variant="h1" sx={{ maxWidth: 760, textWrap: 'balance' }}>{headline(stats)}</Typography> : <Skeleton width={520} height={44} />}
        </Box>
        {mine > 0 && <Button variant="outlined" onClick={all}>You own {mine} open case{mine === 1 ? '' : 's'}</Button>}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {stats ? (
          <>
            <Kpi icon={<InboxOutlinedIcon fontSize="small" />} tone={ink.brand} value={stats.openCases} label="Open requests"
              foot={<Typography variant="body2" sx={{ color: ink.muted }}>{stats.awaitingCustomer} waiting on the customer</Typography>} />
            <Kpi icon={<ErrorOutlineIcon fontSize="small" />} tone={riskColor.Overdue} value={stats.overdue} label="Past the deadline" onClick={() => show('Overdue')}
              foot={<Typography variant="body2" sx={{ color: stats.overdue ? riskColor.Overdue : ink.muted, fontWeight: 500 }}>{stats.overdue ? 'Respond today and log the breach' : 'Nothing late'}</Typography>} />
            <Kpi icon={<HourglassBottomIcon fontSize="small" />} tone={riskColor.Critical} value={stats.critical} label="Due within 3 days" onClick={() => show('Critical')}
              foot={<Typography variant="body2" sx={{ color: ink.muted }}>{stats.warning} more due this week</Typography>} />
            <Kpi icon={<VerifiedOutlinedIcon fontSize="small" />} tone={riskColor.OnTrack} label="Decided on time, 90 days"
              value={stats.onTimeRate == null ? '–' : `${stats.onTimeRate}%`}
              foot={<Box>
                <LinearProgress variant="determinate" value={stats.onTimeRate ?? 0} aria-label="On-time rate"
                  sx={{ height: 6, borderRadius: 3, bgcolor: riskTint.Overdue, '& .MuiLinearProgress-bar': { bgcolor: riskColor.OnTrack, borderRadius: 3 } }} />
                <Typography variant="body2" sx={{ color: ink.muted, mt: 1 }}>{stats.onTimeLast90Days} of {stats.respondedLast90Days} decisions, avg {stats.avgDaysToRespond ?? '–'} days</Typography>
              </Box>} />
          </>
        ) : [...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: '16px' }} />)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' }, gap: 3, alignItems: 'start' }}>
        <Box sx={panel}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, gap: 2 }}>
            <Box>
              <Typography variant="h2">Deadline runway</Typography>
              <Typography variant="body2" sx={{ color: ink.muted }}>Each bar runs from when the clock started to the date a decision is legally due.</Typography>
            </Box>
            <Button size="small" onClick={all}>View all</Button>
          </Box>
          {cases ? <DeadlineRunway cases={cases} /> : <Skeleton variant="rounded" height={300} />}
        </Box>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <Box sx={panel}>
            <Typography variant="h2" sx={{ mb: 2 }}>Open cases by risk</Typography>
            {cases ? <RiskDonut cases={cases} /> : <Skeleton variant="circular" width={132} height={132} />}
          </Box>

          <Box sx={panel}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h2">Alerts</Typography>
              <Button size="small" disabled={running} onClick={() => runMonitor()}>Run check</Button>
            </Box>
            <Typography variant="body2" sx={{ color: ink.muted, mb: 1 }}>From the 8am deadline check.</Typography>
            {!alerts?.length ? (
              <Typography sx={{ color: ink.muted, py: 2 }}>No open alerts.</Typography>
            ) : alerts.map((a) => (
              <Box key={a.alertId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderTop: `1px solid ${ink.line}` }}>
                <OwnerAvatar name={a.assignedTo} size={32} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography component={RouterLink} to={`/cases/${a.caseId}`}
                    sx={{ fontWeight: 600, fontSize: 14, color: ink.text, textDecoration: 'none', '&:hover': { color: ink.brand } }}>
                    {a.customerName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: a.riskLevel === 'Overdue' ? riskColor.Overdue : riskColor.Critical, fontSize: 12.5 }}>
                    {a.alertType === 'ResponseDue' ? 'Decision' : 'Variation notice'} {a.riskLevel === 'Overdue' ? 'was due' : 'due'} {formatDate(a.dueDate)}
                  </Typography>
                </Box>
                <Tooltip title="Mark as seen">
                  <IconButton size="small" aria-label={`Mark alert for ${a.customerName} as seen`} onClick={() => acknowledge(a.alertId)}><CheckIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
