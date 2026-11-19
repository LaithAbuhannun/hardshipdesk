import { useState } from 'react';
import { Badge, Box, Button, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { isDemo, useGetAlertsQuery, useGetDashboardQuery } from './api/hardshipApi';
import { NewCaseDialog } from './components/NewCaseDialog';
import { OwnerAvatar } from './components/OwnerAvatar';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { CasesPage } from './pages/CasesPage';
import { DashboardPage } from './pages/DashboardPage';
import { setFilter, useAppDispatch } from './store';
import { ink, riskColor } from './theme';
import { CURRENT_USER } from './lib/user';


function Logo() {
  return (
    <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: ink.brand, display: 'grid', placeItems: 'center' }}>
      <svg width="20" height="20" viewBox="0 0 26 26" aria-hidden>
        <circle cx="13" cy="14" r="10" fill="none" stroke="#fff" strokeWidth="2.4" />
        <path d="M13 8v6l4 2.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M13 1.5v3" stroke="#F2B544" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </Box>
  );
}

const navItem = {
  display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: 2, color: ink.muted,
  textDecoration: 'none', fontSize: 14.5, fontWeight: 500,
  '& svg': { color: ink.faint },
  '&:hover': { color: ink.text, bgcolor: ink.paper },
  '&.active': { color: ink.brand, bgcolor: ink.brandSoft, fontWeight: 600, '& svg': { color: ink.brand } },
  '&:focus-visible': { outline: `2px solid ${ink.brand}`, outlineOffset: 1 },
};

function TopBar({ onCreate }: { onCreate: () => void }) {
  const [q, setQ] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: alerts } = useGetAlertsQuery();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 2, md: 4 }, height: 68, borderBottom: `1px solid ${ink.line}`, bgcolor: ink.surface, position: 'sticky', top: 0, zIndex: 10 }}>
      <Box component="form" sx={{ flexGrow: 1, maxWidth: 420 }}
        onSubmit={(e) => { e.preventDefault(); dispatch(setFilter({ search: q, status: undefined, risk: undefined })); navigate('/cases'); }}>
        <TextField size="small" fullWidth placeholder="Search customers, cases or contracts" value={q} onChange={(e) => setQ(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: ink.paper, '& fieldset': { borderColor: 'transparent' } } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: ink.faint }} /></InputAdornment> } }} />
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      {isDemo && <Typography variant="body2" sx={{ color: ink.faint, display: { xs: 'none', lg: 'block' } }}>Demo data, changes aren’t saved</Typography>}
      <Tooltip title="Deadline alerts">
        <IconButton aria-label="Deadline alerts" onClick={() => navigate('/')} sx={{ border: `1px solid ${ink.line}`, borderRadius: 2 }}>
          <Badge badgeContent={alerts?.length ?? 0} color="error"><NotificationsNoneOutlinedIcon fontSize="small" /></Badge>
        </IconButton>
      </Tooltip>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={{ height: 40 }}>Log notice</Button>
    </Box>
  );
}

export default function App() {
  const [creating, setCreating] = useState(false);
  const { data: stats } = useGetDashboardQuery();
  const urgent = (stats?.overdue ?? 0) + (stats?.critical ?? 0);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: ink.paper }}>
      <Box component="nav" sx={{
        width: 252, flexShrink: 0, bgcolor: ink.surface, borderRight: `1px solid ${ink.line}`, px: 2, py: 2.5,
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 0.5, position: 'sticky', top: 0, height: '100vh',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5, pb: 3 }}>
          <Logo />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>HardshipDesk</Typography>
            <Typography variant="body2" sx={{ color: ink.faint, fontSize: 12 }}>Credit hardship team</Typography>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: ink.faint, px: 1.5, pb: 0.5, fontSize: 12.5 }}>Workspace</Typography>
        <Box component={NavLink} to="/" end sx={navItem}><SpaceDashboardOutlinedIcon fontSize="small" />Overview</Box>
        <Box component={NavLink} to="/cases" sx={navItem}>
          <InboxOutlinedIcon fontSize="small" />Cases
          {urgent > 0 && (
            <Box component="span" sx={{ ml: 'auto', minWidth: 22, px: 0.75, height: 20, borderRadius: 999, bgcolor: `${riskColor.Overdue}18`, color: riskColor.Overdue, fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
              {urgent}
            </Box>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ border: `1px solid ${ink.line}`, borderRadius: 3, p: 1.75, mb: 1.5, bgcolor: ink.paper }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
            <GavelOutlinedIcon sx={{ fontSize: 18, color: ink.brand }} />
            <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>The 21-day rule</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: ink.muted, fontSize: 12.5 }}>
            Lenders must decide on a hardship notice within 21 days, or 28 if requested information never arrives (NCC s72).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5, pt: 1.5, borderTop: `1px solid ${ink.line}` }}>
          <OwnerAvatar name={CURRENT_USER} size={36} />
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{CURRENT_USER}</Typography>
            <Typography variant="body2" sx={{ color: ink.faint, fontSize: 12 }}>Hardship specialist</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <TopBar onCreate={() => setCreating(true)} />
        <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3.5 } }}>
          <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Box>
      <NewCaseDialog open={creating} onClose={() => setCreating(false)} />
    </Box>
  );
}
