import { useState } from 'react';
import { AppBar, Box, Button, Chip, Container, Toolbar, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { isDemo } from './api/hardshipApi';
import { NewCaseDialog } from './components/NewCaseDialog';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { CasesPage } from './pages/CasesPage';
import { DashboardPage } from './pages/DashboardPage';

const navSx = { color: 'inherit', '&.active': { bgcolor: 'rgba(255,255,255,0.15)' } };

export default function App() {
  const [creating, setCreating] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mr: 2 }}>⏱ HardshipDesk</Typography>
          <Button component={NavLink} to="/" end sx={navSx}>Dashboard</Button>
          <Button component={NavLink} to="/cases" sx={navSx}>Cases</Button>
          <Box sx={{ flexGrow: 1 }} />
          {isDemo && <Chip label="Demo data" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />}
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setCreating(true)}>Log notice</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
      <NewCaseDialog open={creating} onClose={() => setCreating(false)} />
    </Box>
  );
}
