import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { isDemo, useGetDashboardQuery } from './api/hardshipApi';
import { NewCaseDialog } from './components/NewCaseDialog';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { CasesPage } from './pages/CasesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ink, riskColor } from './theme';

function Logo() {
  // A clock face cut by a single deadline tick.
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="11" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M13 6v7l4.5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M13 2v3" stroke="#F2B544" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const navItem = {
  display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1, borderRadius: 1.5, color: 'rgba(255,255,255,0.72)',
  textDecoration: 'none', fontSize: 14.5, fontWeight: 500,
  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
  '&.active': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' },
  '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 1 },
};

export default function App() {
  const [creating, setCreating] = useState(false);
  const { data: stats } = useGetDashboardQuery();
  const urgent = (stats?.overdue ?? 0) + (stats?.critical ?? 0);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: ink.paper }}>
      <Box component="nav" sx={{
        width: 236, flexShrink: 0, bgcolor: ink.brand, color: '#fff', p: 2, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 0.5,
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, pb: 3, pt: 0.5 }}>
          <Logo />
          <Typography sx={{ fontWeight: 600, fontSize: 17 }}>HardshipDesk</Typography>
        </Box>
        <Box component={NavLink} to="/" end sx={navItem}><SpaceDashboardOutlinedIcon fontSize="small" />Today</Box>
        <Box component={NavLink} to="/cases" sx={navItem}>
          <InboxOutlinedIcon fontSize="small" />All cases
          {urgent > 0 && (
            <Box component="span" sx={{ ml: 'auto', minWidth: 22, px: 0.75, height: 20, borderRadius: 999, bgcolor: riskColor.Overdue, color: '#fff', fontSize: 12, fontWeight: 600, display: 'grid', placeItems: 'center' }}>
              {urgent}
            </Box>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={() => setCreating(true)} startIcon={<AddIcon />}
          sx={{ bgcolor: '#fff', color: ink.brand, justifyContent: 'flex-start', '&:hover': { bgcolor: '#EAF2F3' } }}>
          Log a hardship notice
        </Button>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', px: 1, pt: 2, fontSize: 12.5 }}>
          {isDemo ? 'Demo data. Nothing you do here is saved.' : 'National Credit Code s72 timeframes'}
        </Typography>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, md: 5 }, py: { xs: 2, md: 4 } }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: ink.brand }}>HardshipDesk</Typography>
          <Button size="small" variant="contained" onClick={() => setCreating(true)}>Log notice</Button>
        </Box>
        <Box sx={{ maxWidth: 1120 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
      <NewCaseDialog open={creating} onClose={() => setCreating(false)} />
    </Box>
  );
}
