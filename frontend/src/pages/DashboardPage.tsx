import { Box, Button, IconButton, Skeleton, Tooltip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAcknowledgeAlertMutation, useGetAlertsQuery, useGetCasesQuery, useGetDashboardQuery, useRunDeadlineMonitorMutation } from '../api/hardshipApi';
import type { Dashboard } from '../api/types';
import { DeadlineRunway } from '../components/DeadlineRunway';
import { formatDate, todaySydney } from '../lib/dates';
import { setFilter, useAppDispatch } from '../store';
import { ink, riskColor } from '../theme';

const panel = { bgcolor: ink.surface, border: `1px solid ${ink.line}`, borderRadius: 3, p: { xs: 2, md: 3 } };

/** The day's situation in one plain sentence, instead of a wall of stat cards. */
function headline(s: Dashboard) {
  const parts: string[] = [];
  if (s.overdue) parts.push(`${s.overdue} decision${s.overdue === 1 ? ' is' : 's are'} already late`);
  if (s.critical) parts.push(`${s.critical} ${s.critical === 1 ? 'is' : 'are'} due in the next 3 days`);
  if (!parts.length) return 'Every open hardship request is inside its deadline.';
  return `${parts.join(' and ')}.`.replace(/^./, (c) => c.toUpperCase());
}

function Figure({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1, color: color ?? ink.text }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: ink.muted }}>{label}</Typography>
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

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="body2" sx={{ color: ink.muted, mb: 0.5 }}>{today}</Typography>
        {stats ? (
          <Typography variant="h1" sx={{ maxWidth: 760, textWrap: 'balance', color: stats.overdue ? riskColor.Overdue : ink.text }}>{headline(stats)}</Typography>
        ) : <Skeleton width={520} height={44} />}
      </Box>

      {stats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 6, rowGap: 2 }}>
          <Figure value={stats.openCases} label="Open requests" />
          <Figure value={stats.awaitingCustomer} label="Waiting on the customer" />
          <Figure value={stats.onTimeRate == null ? '–' : `${stats.onTimeRate}%`} label="Decided on time, last 90 days"
            color={stats.onTimeRate != null && stats.onTimeRate < 100 ? riskColor.Critical : undefined} />
          <Figure value={stats.avgDaysToRespond ?? '–'} label="Average days to decide" />
          {stats.variationNoticesPending > 0 && <Figure value={stats.variationNoticesPending} label="Variation notices to send" color={riskColor.Critical} />}
        </Box>
      )}

      <Box sx={panel}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h2">Deadline runway</Typography>
            <Typography variant="body2" sx={{ color: ink.muted }}>Each bar runs from when the clock started to the date a decision is legally due.</Typography>
          </Box>
          <Button size="small" onClick={() => { dispatch(setFilter({ status: undefined, risk: undefined })); navigate('/cases'); }}>See all cases</Button>
        </Box>
        {cases ? <DeadlineRunway cases={cases} /> : <Skeleton variant="rounded" height={260} />}
      </Box>

      <Box sx={panel}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1, gap: 2 }}>
          <Box>
            <Typography variant="h2">Alerts from this morning’s check</Typography>
            <Typography variant="body2" sx={{ color: ink.muted }}>The check runs at 8am Sydney time and flags anything due within 3 days or overdue.</Typography>
          </Box>
          <Button size="small" variant="outlined" disabled={running} onClick={() => runMonitor()}>Run check now</Button>
        </Box>
        {!alerts?.length ? (
          <Typography sx={{ color: ink.muted, py: 2 }}>No open alerts. New ones appear here after the next check.</Typography>
        ) : (
          alerts.map((a) => (
            <Box key={a.alertId} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderTop: `1px solid ${ink.line}` }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: riskColor[a.riskLevel], flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography component={RouterLink} to={`/cases/${a.caseId}`} sx={{ fontWeight: 600, color: ink.text, textDecoration: 'none', '&:hover': { color: ink.brand } }}>
                  {a.customerName}
                </Typography>
                <Typography variant="body2" sx={{ color: ink.muted }}>
                  {a.alertType === 'ResponseDue' ? 'Decision' : 'Written variation notice'}{' '}
                  {a.riskLevel === 'Overdue' ? 'was due' : 'is due'} {formatDate(a.dueDate)}
                  {a.assignedTo ? `, assigned to ${a.assignedTo}` : ', not assigned'}
                </Typography>
              </Box>
              <Tooltip title="Mark as seen">
                <IconButton size="small" aria-label={`Mark alert for ${a.customerName} as seen`} onClick={() => acknowledge(a.alertId)}><CheckIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
