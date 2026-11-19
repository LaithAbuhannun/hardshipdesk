import { Alert as MuiAlert, Box, Button, Card, CardContent, Grid2 as Grid, IconButton, List, ListItem, ListItemText, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAcknowledgeAlertMutation, useGetAlertsQuery, useGetCasesQuery, useGetDashboardQuery, useRunDeadlineMonitorMutation } from '../api/hardshipApi';
import { RiskChip } from '../components/RiskChip';
import { describeDaysRemaining, formatDate } from '../lib/dates';
import { setFilter, useAppDispatch } from '../store';
import type { RiskLevel } from '../api/types';

function Stat({ label, value, tone, onClick }: { label: string; value: string | number; tone?: string; onClick?: () => void }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { borderColor: 'primary.main' } : undefined }} onClick={onClick}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: tone }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useGetDashboardQuery();
  const { data: atRisk } = useGetCasesQuery({});
  const { data: alerts } = useGetAlertsQuery();
  const [acknowledge] = useAcknowledgeAlertMutation();
  const [runMonitor, { isLoading: running }] = useRunDeadlineMonitorMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const openRisk = (risk: RiskLevel) => {
    dispatch(setFilter({ risk, status: undefined }));
    navigate('/cases');
  };

  const urgent = (atRisk ?? []).filter((c) => !c.respondedDate && ['Overdue', 'Critical', 'Warning'].includes(c.riskLevel));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Hardship deadlines</Typography>
        <Typography color="text.secondary">Every hardship notice must get a decision within the National Credit Code timeframes.</Typography>
      </Box>

      {stats && stats.overdue > 0 && (
        <MuiAlert severity="error" action={<Button color="inherit" size="small" onClick={() => openRisk('Overdue')}>View</Button>}>
          {stats.overdue} case{stats.overdue === 1 ? ' is' : 's are'} past the statutory deadline. Respond today and record the breach.
        </MuiAlert>
      )}

      <Grid container spacing={2}>
        {isLoading || !stats ? (
          [...Array(6)].map((_, i) => <Grid key={i} size={{ xs: 6, md: 2 }}><Skeleton variant="rounded" height={96} /></Grid>)
        ) : (
          <>
            <Grid size={{ xs: 6, md: 2 }}><Stat label="Open cases" value={stats.openCases} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Stat label="Overdue" value={stats.overdue} tone="error.main" onClick={() => openRisk('Overdue')} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Stat label="Due in 3 days" value={stats.critical} tone="warning.dark" onClick={() => openRisk('Critical')} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Stat label="Waiting on customer" value={stats.awaitingCustomer} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Stat label="On-time rate (90 days)" value={stats.onTimeRate == null ? '—' : `${stats.onTimeRate}%`} tone={stats.onTimeRate != null && stats.onTimeRate < 100 ? 'warning.dark' : 'success.main'} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Stat label="Avg days to decide" value={stats.avgDaysToRespond ?? '—'} /></Grid>
          </>
        )}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Needs a decision soon</Typography>
              {urgent.length === 0 ? (
                <Typography color="text.secondary">Nothing due in the next 7 days.</Typography>
              ) : (
                <List disablePadding>
                  {urgent.map((c) => (
                    <ListItem key={c.caseId} divider component={RouterLink} to={`/cases/${c.caseId}`} sx={{ color: 'inherit', px: 0 }}
                      secondaryAction={<RiskChip level={c.riskLevel} />}>
                      <ListItemText
                        primary={`${c.caseReference} · ${c.customerName}`}
                        secondary={`${c.productType} · due ${formatDate(c.responseDueDate)} · ${describeDaysRemaining(c.daysRemaining, false)}${c.assignedTo ? ` · ${c.assignedTo}` : ' · unassigned'}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Alerts</Typography>
                <Tooltip title="The Hangfire job runs every day at 8am Sydney time. Run it now to check again.">
                  <span>
                    <Button size="small" startIcon={<PlayArrowIcon />} disabled={running} onClick={() => runMonitor()}>Run check</Button>
                  </span>
                </Tooltip>
              </Stack>
              {!alerts?.length ? (
                <Typography color="text.secondary">No open alerts.</Typography>
              ) : (
                <List disablePadding>
                  {alerts.map((a) => (
                    <ListItem key={a.alertId} divider sx={{ px: 0 }}
                      secondaryAction={<Tooltip title="Acknowledge"><IconButton edge="end" onClick={() => acknowledge(a.alertId)}><CheckIcon /></IconButton></Tooltip>}>
                      <ListItemText
                        primary={<RouterLink to={`/cases/${a.caseId}`} style={{ color: 'inherit' }}>{a.caseReference} · {a.customerName}</RouterLink>}
                        secondary={`${a.alertType === 'ResponseDue' ? 'Decision' : 'Written variation notice'} ${a.riskLevel === 'Overdue' ? 'overdue since' : 'due'} ${formatDate(a.dueDate)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
