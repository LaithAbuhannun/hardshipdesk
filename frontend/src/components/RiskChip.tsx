import { Chip, type ChipProps } from '@mui/material';
import type { CaseStatus, RiskLevel } from '../api/types';

const risk: Record<RiskLevel, { label: string; color: ChipProps['color']; variant?: ChipProps['variant'] }> = {
  OnTrack: { label: 'On track', color: 'success', variant: 'outlined' },
  Warning: { label: 'Due this week', color: 'warning', variant: 'outlined' },
  Critical: { label: 'Critical', color: 'warning' },
  Overdue: { label: 'Overdue', color: 'error' },
  Met: { label: 'Met', color: 'success' },
  Breached: { label: 'Breached', color: 'error', variant: 'outlined' },
};

export function RiskChip({ level, size = 'small' }: { level: RiskLevel; size?: ChipProps['size'] }) {
  const r = risk[level];
  return <Chip size={size} label={r.label} color={r.color} variant={r.variant ?? 'filled'} sx={{ fontWeight: 600 }} />;
}

export const riskLabel = (level: RiskLevel) => risk[level].label;

const statusLabels: Record<CaseStatus, string> = {
  Open: 'Open',
  InfoRequested: 'Waiting on customer',
  InfoReceived: 'Info received',
  Responded: 'Responded',
};

export const statusLabel = (s: CaseStatus) => statusLabels[s];
