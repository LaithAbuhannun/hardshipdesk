import { createTheme } from '@mui/material';
import type { RiskLevel } from './api/types';

/** Design tokens. One cool, quiet base; colour is reserved for deadline risk. */
export const ink = {
  paper: '#F5F6F8',
  surface: '#FFFFFF',
  text: '#1A2130',
  muted: '#5E6778',
  faint: '#98A0AE',
  line: '#E2E5EB',
  brand: '#0E5560', // deep petrol: banking-serious, not a startup accent
  brandSoft: '#E3EEEF',
};

export const riskColor: Record<RiskLevel, string> = {
  Overdue: '#C23A30',
  Critical: '#D27717',
  Warning: '#B9922A',
  OnTrack: '#2E7D5B',
  Met: '#2E7D5B',
  Breached: '#C23A30',
};

export const riskTint: Record<RiskLevel, string> = {
  Overdue: '#FBE9E7',
  Critical: '#FCEFDF',
  Warning: '#F7F0DC',
  OnTrack: '#E5F2EC',
  Met: '#E5F2EC',
  Breached: '#FBE9E7',
};

export const theme = createTheme({
  palette: {
    primary: { main: ink.brand },
    text: { primary: ink.text, secondary: ink.muted },
    divider: ink.line,
    background: { default: ink.paper, paper: ink.surface },
    error: { main: riskColor.Overdue },
    warning: { main: riskColor.Critical },
    success: { main: riskColor.OnTrack },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    h1: { fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.2 },
    h2: { fontSize: 20, fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: 15, lineHeight: 1.55 },
    body2: { fontSize: 13.5, lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFeatureSettings: '"tnum" 1', WebkitFontSmoothing: 'antialiased' },
        '@media (prefers-reduced-motion: reduce)': { '*': { animation: 'none !important', transition: 'none !important' } },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 6, paddingInline: 14, whiteSpace: 'nowrap', flexShrink: 0 } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 6, backgroundColor: ink.surface } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: ink.line, paddingBlock: 12 },
        head: { color: ink.muted, fontWeight: 500, fontSize: 13, backgroundColor: ink.surface },
      },
    },
  },
});
