import React, {useEffect, useState} from 'react';
import {Box, Button, Paper, Stack, Typography} from '@mui/material';

import {useStore} from '../store';

export const Result: React.FC = () => {
  const {processedFile, clearResult, reset} = useStore((state) => state);
  const [videoSrc, setVideoSrc] = useState<string>('');

  useEffect(() => {
    const loadVideo = async () => {
      if (processedFile) {
        try {
          const base64 = await window.api.readFile(processedFile);
          setVideoSrc(base64);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to load video base64', e);
        }
      }
    };
    void loadVideo();
  }, [processedFile]);

  const handleShowInFolder = () => {
    if (processedFile) {
      void window.api.showItemInFolder(processedFile);
    }
  };

  return (
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
      <Typography variant="h4" gutterBottom sx={{fontWeight: 'bold'}}>
        Sticker Ready!
      </Typography>

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
            <Typography>Loading...</Typography>
          </Box>
        )}
      </Paper>

      <Typography variant="body2" sx={{mb: 3, color: 'text.secondary', bgcolor: '#e0e0e0', p: 1, borderRadius: 1}}>
        {processedFile}
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button variant="outlined" onClick={clearResult}>
          Back to Edit
        </Button>
        <Button variant="contained" onClick={handleShowInFolder}>
          Show in Folder
        </Button>
        <Button variant="text" color="error" onClick={reset}>
          Start Over
        </Button>
      </Stack>
    </Box>
  );
};
