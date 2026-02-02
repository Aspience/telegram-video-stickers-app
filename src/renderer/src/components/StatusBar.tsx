import React, {useState} from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';

interface StatusBarProps {
  error?: string | null;
  isValid: boolean;
  effectiveDuration: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({error, isValid, effectiveDuration}) => {
  const [isErrorOpen, setIsErrorOpen] = useState(false);

  const handleCopyError = () => {
    if (error) {
      void navigator.clipboard.writeText(error);
    }
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: '#f0f0f0', // System-like light gray
          borderTop: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          height: '40px',
          padding: '0 8px',
          justifyContent: 'space-between',
          zIndex: 1000,
          fontSize: '12px',
          color: '#333',
          userSelect: 'none', // Standard for status bars
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center'}}>
          {error && (
            <Tooltip title="View Error">
              <Box
                component="span"
                onClick={() => setIsErrorOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  bgcolor: '#d32f2f', // error.main
                  px: 1,
                  py: '2px', // Slight vertical padding
                  borderRadius: '4px', // Rounded badge look
                  ml: 1, // Margin from left edge if needed
                  animation: 'pulse 1.5s infinite',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '@keyframes pulse': {
                    '0%': {boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.7)'},
                    '70%': {boxShadow: '0 0 0 6px rgba(211, 47, 47, 0)'},
                    '100%': {boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)'},
                  },
                  '&:hover': {
                    bgcolor: '#b71c1c', // darker red on hover
                    animation: 'none', // stop pulsing on hover to make it easier to click
                  },
                }}
              >
                <ErrorOutlineIcon sx={{fontSize: 16, mr: 0.5}} />
                <Typography variant="caption" sx={{fontWeight: 600, color: 'inherit'}}>
                  Error
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        <Typography
          variant="caption"
          sx={{
            color: isValid ? 'inherit' : 'error.main',
            fontWeight: 500,
            fontSize: '11px',
            fontFamily: 'Segoe UI, system-ui, sans-serif', // System fonts
          }}
        >
          Total Duration: {effectiveDuration.toFixed(2)}s / 3.0s
        </Typography>
      </Box>

      {/* Error Detail Dialog */}
      <Dialog open={isErrorOpen} onClose={() => setIsErrorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          Error Details
          <Tooltip title="Copy to Clipboard">
            <IconButton onClick={handleCopyError} size="small">
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              p: 2,
              bgcolor: '#ffebee',
              color: '#c62828',
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 300,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsErrorOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
