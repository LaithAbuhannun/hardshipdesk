import { Box, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { CaseSummary } from '../api/types';
import { addDays, daysBetween, formatDate, todaySydney } from '../lib/dates';
import { ink, riskColor, riskTint } from '../theme';

const PAST = 28;
const AHEAD = 24;

/**
 * The signature view: every open case as a bar running from the day its clock started
 * to its legal deadline, against a single "today" line. Bars that cross the line are late.
 */
export function DeadlineRunway({ cases }: { cases: CaseSummary[] }) {
  const navigate = useNavigate();
  const today = todaySydney();
  const start = addDays(today, -PAST);
  const span = PAST + AHEAD;
  const pct = (date: string) => Math.min(100, Math.max(0, (daysBetween(start, date) / span) * 100));
  const todayPct = pct(today);
  const weeks = [-28, -21, -14, -7, 7, 14, 21];

  const open = cases.filter((c) => !c.respondedDate).sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <Box>
      {/* Axis */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr 120px' }, columnGap: 2 }}>
        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
        <Box sx={{ position: 'relative', height: 22 }}>
          {weeks.map((w) => (
            <Typography key={w} variant="body2" sx={{ position: 'absolute', left: `${pct(addDays(today, w))}%`, transform: 'translateX(-50%)', color: ink.faint, fontSize: 12 }}>
              {w > 0 ? `+${w}d` : `${w}d`}
            </Typography>
          ))}
          <Typography variant="body2" sx={{ position: 'absolute', left: `${todayPct}%`, transform: 'translateX(-50%)', color: ink.text, fontWeight: 600, fontSize: 12 }}>
            Today
          </Typography>
        </Box>
        <Box />
      </Box>

      {open.map((c) => {
        const clockStart = c.infoReceivedDate ?? c.infoRequestedDate ?? c.receivedDate;
        const left = pct(clockStart);
        const right = pct(c.responseDueDate);
        const color = riskColor[c.riskLevel];
        const late = c.daysRemaining < 0;
        return (
          <Box
            key={c.caseId}
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/cases/${c.caseId}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/cases/${c.caseId}`)}
            sx={{
              display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '220px 1fr 120px' }, gridTemplateAreas: { xs: '"name days" "bar bar"', md: '"name bar days"' }, columnGap: 2, rowGap: 0.5,
              alignItems: 'center', py: 1.25, borderTop: `1px solid ${ink.line}`, cursor: 'pointer',
              '&:hover .bar': { filter: 'brightness(0.95)' }, '&:hover .name': { color: ink.brand },
              '&:focus-visible': { outline: `2px solid ${ink.brand}`, outlineOffset: 2, borderRadius: 1 },
            }}
          >
            <Box sx={{ minWidth: 0, gridArea: 'name' }}>
              <Typography className="name" sx={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.customerName}</Typography>
              <Typography variant="body2" sx={{ color: ink.muted }}>{c.caseReference}, {c.productType.toLowerCase()}</Typography>
            </Box>

            <Box sx={{ position: 'relative', height: 28, gridArea: 'bar' }}>
              {/* today line */}
              <Box sx={{ position: 'absolute', left: `${todayPct}%`, top: -12, bottom: -12, width: '2px', bgcolor: ink.text, opacity: 0.85 }} />
              <Tooltip title={`Clock started ${formatDate(clockStart)}, decision due ${formatDate(c.responseDueDate)}`}>
                <Box className="bar" sx={{
                  position: 'absolute', top: 6, height: 16, left: `${left}%`, width: `${Math.max(1, right - left)}%`,
                  borderRadius: '4px', bgcolor: riskTint[c.riskLevel], overflow: 'hidden', border: `1px solid ${color}33`,
                }}>
                  {/* elapsed portion */}
                  <Box sx={{ height: '100%', width: late ? '100%' : `${((todayPct - left) / Math.max(1, right - left)) * 100}%`, bgcolor: color, opacity: 0.85 }} />
                </Box>
              </Tooltip>
              {/* deadline tick */}
              <Box sx={{ position: 'absolute', left: `calc(${right}% - 1px)`, top: 2, height: 24, width: '2px', bgcolor: color }} />
            </Box>

            <Box sx={{ textAlign: 'right', gridArea: 'days' }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: late || c.daysRemaining <= 3 ? color : ink.text }}>
                {late ? `${-c.daysRemaining}d late` : c.daysRemaining === 0 ? 'Due today' : `${c.daysRemaining}d left`}
              </Typography>
              <Typography variant="body2" sx={{ color: ink.muted }}>{formatDate(c.responseDueDate)}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
