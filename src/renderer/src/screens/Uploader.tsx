import React, {useCallback} from 'react';
import {useDropzone} from 'react-dropzone';
import {useTranslation} from 'react-i18next';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {Box, Paper, Typography} from '@mui/material';

import {AppLayout} from '../components/AppLayout';
import {useStore} from '../store';

export const Uploader: React.FC = () => {
  const {t} = useTranslation();
  const setFile = useStore((state) => state.setFile);
  const showNotification = useStore((state) => state.showNotification);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        try {
          // Electron specific: get path
          const path = file.path || file.name;
          const meta = await window.api.getVideoMeta(path);

          setFile(file, path, meta);
        } catch (e) {
          console.error(e);
          showNotification(t('Uploader.errorOpeningFile', {error: (e as Error).message}), 'error');
        }
      }
    },
    [setFile, showNotification, t]
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((file) => {
        const errorMsg = file.errors.map((e) => e.message).join(', ');
        showNotification(t('Uploader.fileRejected', {error: errorMsg}), 'error');
      });
    },
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
    },
  });

  return (
    <AppLayout>
      <Box
        {...getRootProps()}
        sx={{
          p: 4,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isDragActive ? '#e3f2fd' : 'transparent',
          outline: 'none',
        }}
      >
        <input {...getInputProps()} />
        <Paper
          sx={{
            p: 6,
            border: '2px dashed #2481cc',
            cursor: 'pointer',
            bgcolor: 'white',
            textAlign: 'center',
          }}
        >
          <CloudUploadIcon sx={{fontSize: 60, color: '#2481cc', mb: 2}} />
          <Typography variant="h6">{t('Uploader.dragDrop')}</Typography>
          <Typography variant="body2" color="textSecondary">
            {t('Uploader.formats')}
          </Typography>
        </Paper>
      </Box>
    </AppLayout>
  );
};
