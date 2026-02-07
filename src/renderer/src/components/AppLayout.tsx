import React from 'react';
import {Box} from '@mui/material';

import {StatusBar} from './StatusBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({children}) => {
  return (
    <Box sx={{display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', bgcolor: '#f5f5f5'}}>
      <Box sx={{flex: 1, overflow: 'hidden', position: 'relative'}}>{children}</Box>
      <StatusBar />
    </Box>
  );
};
