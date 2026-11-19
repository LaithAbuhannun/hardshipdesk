import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { store } from './store';

const theme = createTheme({
  palette: {
    primary: { main: '#1d3b6f' },
    secondary: { main: '#f2a900' },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif' },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Hash routing keeps deep links working on static hosting such as GitHub Pages. */}
        <HashRouter>
          <App />
        </HashRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
