import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';

import {useStore} from '../store';
import {getResultDuration} from '../utils/getResultDuration';

export const StatusBar: React.FC = () => {
  const {t, i18n} = useTranslation();
  const {file, processedFile, trim, boomerang, speed, error, setError} = useStore((state) => state);
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const effectiveDuration = getResultDuration({trim, boomerang, speed});
  const isValid = effectiveDuration <= 3.0;
  // Show duration only in Editor (file is present but not yet processed)
  const isEditor = !!file && !processedFile;

  const handleCopyError = () => {
    if (error) {
      void navigator.clipboard.writeText(error);
    }
  };

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
    handleLanguageClose();
  };

  return (
    <>
      <Box
        sx={{
          bgcolor: '#f0f0f0', // System-like light gray
          borderTop: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          height: '40px',
          padding: '0 8px',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#333',
          userSelect: 'none', // Standard for status bars
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center'}}>
          {/* Language Selector */}
          <IconButton size="small" onClick={handleLanguageClick} sx={{mr: 1}}>
            <TranslateIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleLanguageClose}>
            <MenuItem onClick={() => changeLanguage('en')}>English</MenuItem>
            <MenuItem onClick={() => changeLanguage('ru')}>Русский</MenuItem>
          </Menu>

          {error && (
            <Tooltip title={t('StatusBar.errorDetails')}>
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
                  {t('StatusBar.error')}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {isEditor && (
          <Typography
            variant="caption"
            sx={{
              color: isValid ? 'inherit' : 'error.main',
              fontWeight: 600,
              ml: 2,
            }}
          >
            {t('StatusBar.totalDuration')}: {effectiveDuration.toFixed(2)}
            {t('Common.seconds')} / 3.0{t('Common.seconds')}
          </Typography>
        )}
      </Box>

      {/* Error Detail Dialog */}
      <Dialog open={isErrorOpen} onClose={() => setIsErrorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          {t('StatusBar.errorDetails')}
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
          <Button onClick={() => setIsErrorOpen(false)}>{t('StatusBar.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
