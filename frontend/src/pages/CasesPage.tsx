import { useEffect, useState } from 'react';
import { Box, Button, InputAdornment, LinearProgress, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useGetCasesQuery } from '../api/hardshipApi';
import type { CaseStatus, RiskLevel } from '../api/types';
import { RiskChip, riskLabel, statusLabel } from '../components/RiskChip';
import { Owner } from '../components/OwnerAvatar';
import { describeDaysRemaining, formatDate } from '../lib/dates';
import { clearFilters, setFilter, useAppDispatch, useAppSelector } from '../store';
import { ink, riskColor } from '../theme';

const statuses: CaseStatus[] = ['Open', 'InfoRequested', 'InfoReceived', 'Responded'];
const risks: RiskLevel[] = ['Overdue', 'Critical', 'Warning', 'OnTrack', 'Met', 'Breached'];

export function CasesPage() {
  const filters = useAppSelector((s) => s.filters);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState(filters.search ?? '');

  // Debounce typing so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => dispatch(setFilter({ search })), 300);
    return () => clearTimeout(t);
  }, [search, dispatch]);

  const { data, isFetching } = useGetCasesQuery(filters);
  const filtered = !!(filters.status || filters.risk || filters.search);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Typography variant="h1">All cases</Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <TextField size="small" placeholder="Search by name, case or contract" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 300, flexGrow: { xs: 1, sm: 0 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Stage" value={filters.status ?? ''} sx={{ minWidth: 190 }}
          onChange={(e) => dispatch(setFilter({ status: (e.target.value || undefined) as CaseStatus | undefined }))}>
          <MenuItem value="">Any stage</MenuItem>
          {statuses.map((s) => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Deadline" value={filters.risk ?? ''} sx={{ minWidth: 190 }}
          onChange={(e) => dispatch(setFilter({ risk: (e.target.value || undefined) as RiskLevel | undefined }))}>
          <MenuItem value="">Any deadline</MenuItem>
          {risks.map((r) => <MenuItem key={r} value={r}>{riskLabel(r)}</MenuItem>)}
        </TextField>
        {filtered && <Button onClick={() => { setSearch(''); dispatch(clearFilters()); }}>Clear filters</Button>}
      </Box>

      <Box sx={{ bgcolor: ink.surface, border: `1px solid ${ink.line}`, borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ height: 2 }}>{isFetching && <LinearProgress sx={{ height: 2 }} />}</Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Decision due</TableCell>
                <TableCell>Deadline</TableCell>
                <TableCell>Owner</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((c) => (
                <TableRow key={c.caseId} hover tabIndex={0} sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, '&:focus-visible': { outline: `2px solid ${ink.brand}`, outlineOffset: -2 } }}
                  onClick={() => navigate(`/cases/${c.caseId}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/cases/${c.caseId}`)}>
                  <TableCell sx={{ boxShadow: `inset 3px 0 0 ${c.respondedDate ? 'transparent' : riskColor[c.riskLevel]}` }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{c.customerName}</Typography>
                    <Typography variant="body2" sx={{ color: ink.muted }}>{c.caseReference}, {c.productType} {c.contractNumber}</Typography>
                  </TableCell>
                  <TableCell>{statusLabel(c.status)}</TableCell>
                  <TableCell>{formatDate(c.receivedDate)}</TableCell>
                  <TableCell>
                    {formatDate(c.responseDueDate)}
                    <Typography variant="body2" sx={{ color: ink.muted }}>{describeDaysRemaining(c.daysRemaining, !!c.respondedDate)}</Typography>
                  </TableCell>
                  <TableCell><RiskChip level={c.riskLevel} /></TableCell>
                  <TableCell><Owner name={c.assignedTo} /></TableCell>
                </TableRow>
              ))}
              {data?.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: ink.muted }}>No cases match these filters. Clear them to see every case.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
