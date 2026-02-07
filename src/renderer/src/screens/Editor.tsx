import React, {useEffect, useMemo, useRef, useState} from 'react';
import Cropper, {CropperProps} from 'react-easy-crop';
import {useTranslation} from 'react-i18next';
import {Box, Button, Checkbox, CircularProgress, FormControlLabel, Slider, Typography} from '@mui/material';

import {AppLayout} from '../components/AppLayout';
import {ConfirmationDialog} from '../components/ConfirmationDialog';
import {SpeedControl} from '../components/SpeedControl';
import {usePreviewController} from '../hooks/usePreviewController';
import {useStore} from '../store';
import {getResultDuration} from '../utils/getResultDuration';

export const Editor: React.FC = () => {
  const {t} = useTranslation();
  const {
    file,
    filePath,
    trim,
    crop: savedCrop,
    boomerang,
    setTrim,
    setCrop,
    setBoomerang,
    isProcessing,
    setProcessing,
    setProcessedFile,
    reset,
    boomerangFrameTrim,
    setBoomerangFrameTrim,
    speed,
    setError,
  } = useStore((state) => state);

  const [visualCropPosition, setVisualCropPosition] = useState(savedCrop.visualPosition);
  const [zoom, setZoom] = useState(savedCrop.zoom);
  const [totalVideoDuration, setTotalVideoDuration] = useState(0);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const visualCropPositionRef = useRef(visualCropPosition);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    visualCropPositionRef.current = visualCropPosition;
    zoomRef.current = zoom;
  }, [visualCropPosition, zoom]);

  useEffect(() => {
    setVisualCropPosition(savedCrop.visualPosition);
    setZoom(savedCrop.zoom);
  }, []);

  const onCropComplete = (_, croppedAreaPixels) => {
    setCrop({cropAreaPixels: croppedAreaPixels, visualPosition: visualCropPositionRef.current, zoom: zoomRef.current});
  };

  const handleExport = async () => {
    if (!filePath) {
      return;
    }
    setProcessing(true);
    setError(null);
    const outputPath = filePath.replace(/(\.[^.]*)$/, '_sticker.webm');
    if (!outputPath) {
      setProcessing(false);
      return;
    }

    try {
      const resultPath = await window.api.transcodeVideo({
        inputPath: filePath,
        outputPath,
        crop: useStore.getState().crop.cropAreaPixels,
        trim,
        boomerang,
        boomerangFrameTrim: useStore.getState().boomerangFrameTrim,
        speed: useStore.getState().speed,
      });
      setProcessedFile(resultPath);
    } catch (e: unknown) {
      console.error(e);
      setError((e as Error).message || 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const effectiveDuration = getResultDuration({trim, boomerang, speed});
  const isValid = effectiveDuration <= 3.0;

  // Fix for flickering: memoize object URL
  const videoSrc = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);

  // --- Boomerang Emulator Logic ---
  usePreviewController({
    videoRef,
    videoSrc,
    trim,
    boomerang,
    boomerangFrameTrim,
    speed,
  });
  // --------------------------------

  return (
    <AppLayout>
      <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        {/* 1. Cropper Area */}
        <Box sx={{position: 'relative', flex: '0 0 55vh', bgcolor: '#000'}}>
          <Cropper
            setVideoRef={(ref) => {
              videoRef.current = ref.current;
            }}
            video={videoSrc}
            crop={visualCropPosition}
            zoom={zoom}
            aspect={1}
            onCropChange={setVisualCropPosition as CropperProps['onCropChange']}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={() => {
              const video = videoRef.current;
              if (video) {
                const duration = parseFloat((video.duration || 0).toFixed(1));
                setTotalVideoDuration(duration);
                if (trim.start === 0 && trim.end === 3 && duration > 0) {
                  setTrim(0, Math.min(3, duration));
                }
              }
            }}
          />
        </Box>

        {/* 2. Controls Area */}
        <Box sx={{p: 3, bgcolor: 'white', borderTop: '1px solid #ddd', flex: '1 1 auto', overflowY: 'auto'}}>
          {/* Timeline Slider */}
          <Typography gutterBottom>
            {t('Editor.trim')} ({trim.start.toFixed(1)}
            {t('Common.seconds')} - {trim.end.toFixed(1)}
            {t('Common.seconds')})
          </Typography>
          <Slider
            value={[trim.start, trim.end]}
            max={totalVideoDuration}
            step={0.1}
            onChange={(_, val) => {
              const [s, e] = val as number[];
              setTrim(s, e);
            }}
            valueLabelDisplay="auto"
          />

          {/* Manual Zoom Slider */}
          <Box sx={{mt: 2}}>
            <Typography gutterBottom>
              {t('Editor.zoom')} ({zoom.toFixed(1)}x)
            </Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_, val) => setZoom(val as number)}
              valueLabelDisplay="auto"
            />
          </Box>

          <SpeedControl />

          <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2}}>
            <Box>
              <FormControlLabel
                control={<Checkbox checked={boomerang} onChange={(e) => setBoomerang(e.target.checked)} />}
                label={t('Editor.boomerangLoop')}
              />

              {boomerang && (
                <Box sx={{ml: 4, mb: 2, width: 220}}>
                  <Typography variant="caption" color="textSecondary">
                    {t('Editor.trimFrames')}: {boomerangFrameTrim}
                  </Typography>
                  <Slider
                    size="small"
                    value={boomerangFrameTrim}
                    min={0}
                    max={5}
                    step={1}
                    marks
                    onChange={(_, val) => setBoomerangFrameTrim(val as number)}
                  />
                </Box>
              )}
            </Box>

            <Box>
              <Box sx={{display: 'flex', gap: 2}}>
                <Button variant="outlined" onClick={() => setIsConfirmationDialogOpen(true)} disabled={isProcessing}>
                  {t('Editor.cancel')}
                </Button>
                <Button variant="contained" disabled={!isValid || isProcessing} onClick={handleExport}>
                  {isProcessing ? <CircularProgress size={24} color="inherit" /> : t('Editor.createSticker')}
                </Button>
              </Box>

              <ConfirmationDialog
                open={isConfirmationDialogOpen}
                onClose={() => setIsConfirmationDialogOpen(false)}
                onConfirm={() => {
                  setIsConfirmationDialogOpen(false);
                  reset();
                }}
                title={t('Editor.cancelTitle')}
                description={t('Editor.cancelConfirm')}
                confirmLabel={t('ConfirmationDialog.confirm')}
                cancelLabel={t('ConfirmationDialog.cancel')}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </AppLayout>
  );
};
