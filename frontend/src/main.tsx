import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import App from './App';
import { store } from './store';
import { theme } from './theme';

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
