import { useEffect, useState } from 'react';
import { Box, Button, Card, InputAdornment, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useGetCasesQuery } from '../api/hardshipApi';
import type { CaseStatus, RiskLevel } from '../api/types';
import { RiskChip, riskLabel, statusLabel } from '../components/RiskChip';
import { describeDaysRemaining, formatDate } from '../lib/dates';
import { clearFilters, setFilter, useAppDispatch, useAppSelector } from '../store';

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

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Cases</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField size="small" placeholder="Search name, case or contract" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Status" value={filters.status ?? ''} sx={{ minWidth: 180 }}
          onChange={(e) => dispatch(setFilter({ status: (e.target.value || undefined) as CaseStatus | undefined }))}>
          <MenuItem value="">All</MenuItem>
          {statuses.map((s) => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Deadline" value={filters.risk ?? ''} sx={{ minWidth: 180 }}
          onChange={(e) => dispatch(setFilter({ risk: (e.target.value || undefined) as RiskLevel | undefined }))}>
          <MenuItem value="">All</MenuItem>
          {risks.map((r) => <MenuItem key={r} value={r}>{riskLabel(r)}</MenuItem>)}
        </TextField>
        <Button onClick={() => { setSearch(''); dispatch(clearFilters()); }}>Clear</Button>
      </Stack>

      <Card variant="outlined">
        {isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Case</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Decision due</TableCell>
                <TableCell>Deadline</TableCell>
                <TableCell>Owner</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((c) => (
                <TableRow key={c.caseId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.caseId}`)}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.caseReference}</TableCell>
                  <TableCell>{c.customerName}<Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>{c.contractNumber}</Box></TableCell>
                  <TableCell>{c.productType}</TableCell>
                  <TableCell>{statusLabel(c.status)}</TableCell>
                  <TableCell>{formatDate(c.receivedDate)}</TableCell>
                  <TableCell>{formatDate(c.responseDueDate)}<Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>{describeDaysRemaining(c.daysRemaining, !!c.respondedDate)}</Box></TableCell>
                  <TableCell><RiskChip level={c.riskLevel} /></TableCell>
                  <TableCell>{c.assignedTo ?? <Box component="span" sx={{ color: 'text.disabled' }}>Unassigned</Box>}</TableCell>
                </TableRow>
              ))}
              {data?.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No cases match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}
