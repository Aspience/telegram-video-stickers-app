import React from 'react';
import ReactDOM from 'react-dom/client';
import {createTheme, CssBaseline, ThemeProvider} from '@mui/material';

import App from './App';

import './assets/index.css';

// Telegram Theme
const theme = createTheme({
  palette: {
    primary: {main: '#2481cc'}, // Telegram Blue
    secondary: {main: '#ffffff'},
    background: {default: '#f1f1f1'},
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
