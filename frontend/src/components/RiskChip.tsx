import { Box } from '@mui/material';
import type { CaseStatus, RiskLevel } from '../api/types';
import { riskColor, riskTint } from '../theme';

const labels: Record<RiskLevel, string> = {
  OnTrack: 'On track',
  Warning: 'Due this week',
  Critical: 'Due within 3 days',
  Overdue: 'Overdue',
  Met: 'Met on time',
  Breached: 'Missed deadline',
};

/** A quiet tinted pill with a dot: colour carries the meaning, the label confirms it. */
export function RiskChip({ level }: { level: RiskLevel; size?: 'small' | 'medium' }) {
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, borderRadius: 999,
      bgcolor: riskTint[level], color: riskColor[level], fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
      {labels[level]}
    </Box>
  );
}

export const riskLabel = (level: RiskLevel) => labels[level];

const statusLabels: Record<CaseStatus, string> = {
  Open: 'New',
  InfoRequested: 'Waiting on customer',
  InfoReceived: 'Ready to decide',
  Responded: 'Decided',
};

export const statusLabel = (s: CaseStatus) => statusLabels[s];
