import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Box, Button, Paper, Stack, Typography} from '@mui/material';

import {AppLayout} from '../components/AppLayout';
import {ConfirmationDialog} from '../components/ConfirmationDialog';
import {useStore} from '../store';

export const Result: React.FC = () => {
  const {t} = useTranslation();
  const {processedFile, clearResult, reset} = useStore((state) => state);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      if (processedFile) {
        try {
          const base64 = await window.api.readFile(processedFile);
          setVideoSrc(base64);
        } catch (e) {
          console.error('Failed to load video base64', e);
        }
      }
    };
    void loadVideo();
  }, [processedFile]);

  const handleOpenFileLocation = () => {
    if (processedFile) {
      void window.api.showItemInFolder(processedFile);
    }
  };

  return (
    <AppLayout>
      <Box
        sx={{
          p: 4,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{p: 2, mb: 3, bgcolor: '#000', borderRadius: 2}}>
          {videoSrc ? (
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              controls
              style={{width: 512, height: 512, display: 'block', objectFit: 'contain'}}
            />
          ) : (
            <Box
              sx={{
                width: 512,
                height: 512,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Typography>{t('Result.loading')}</Typography>
            </Box>
          )}
        </Paper>

        <Typography variant="body2" sx={{mb: 3, color: 'text.secondary', bgcolor: '#e0e0e0', p: 1, borderRadius: 1}}>
          {processedFile}
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={clearResult}>
            {t('Result.backToEdit')}
          </Button>
          <Button variant="contained" onClick={handleOpenFileLocation}>
            {t('Result.showInFolder')}
          </Button>
          <Button variant="text" color="error" onClick={() => setIsConfirmationDialogOpen(true)}>
            {t('Result.startOver')}
          </Button>
        </Stack>

        <ConfirmationDialog
          open={isConfirmationDialogOpen}
          onClose={() => setIsConfirmationDialogOpen(false)}
          onConfirm={() => {
            setIsConfirmationDialogOpen(false);
            reset();
          }}
          title={t('Result.startOverTitle')}
          description={t('Result.startOverConfirm')}
          confirmLabel={t('ConfirmationDialog.confirm')}
          cancelLabel={t('ConfirmationDialog.cancel')}
        />
      </Box>
    </AppLayout>
  );
};
