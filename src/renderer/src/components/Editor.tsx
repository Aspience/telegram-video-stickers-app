import React, {useEffect, useRef, useState} from 'react';
import Cropper, {CropperProps} from 'react-easy-crop';
import {Box, Button, Checkbox, CircularProgress, FormControlLabel, Slider, Typography} from '@mui/material';

import {useStore} from '../store';

export const Editor: React.FC = () => {
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
  } = useStore((state) => state);

  const [crop, setLocalCrop] = useState({x: savedCrop.x, y: savedCrop.y});
  const [zoom, setZoom] = useState(savedCrop.zoom || 1);
  const [videoDuration, setVideoDuration] = useState(0);

  // Sync zoom and local crop when savedCrop changes (e.g. initial load or back from result)
  useEffect(() => {
    setLocalCrop({x: savedCrop.x, y: savedCrop.y});
    if (savedCrop.zoom) {
      setZoom(savedCrop.zoom);
    }
  }, []); // Only on mount to initialize from store

  // Crop completion handler
  const onCropComplete = (_, croppedAreaPixels) => {
    setCrop({...croppedAreaPixels, zoom});
  };

  const [lastError, setLastError] = useState<string | null>(null);

  // Handle Export
  const handleExport = async () => {
    if (!filePath) {
      return;
    }
    setProcessing(true);
    setLastError(null);
    const outputPath = filePath.replace(/(\.[^.]*)$/, '_sticker.webm');
    if (!outputPath) {
      setProcessing(false);
      return;
    }

    try {
      const resultPath = await window.api.transcodeVideo({
        inputPath: filePath,
        outputPath,
        crop: useStore.getState().crop,
        trim,
        boomerang,
        boomerangFrameTrim: useStore.getState().boomerangFrameTrim,
      });
      setProcessedFile(resultPath);
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error(e);
      setLastError((e as Error).message || 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  // Duration Validation Logic
  const selectedDuration = trim.end - trim.start;
  const effectiveDuration = boomerang ? selectedDuration * 2 : selectedDuration;
  const isValid = effectiveDuration <= 3.0;

  // Fix for flickering: memoize object URL
  const videoSrc = React.useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);

  // Boomerang Preview Logic
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isReverseRef = useRef(false);
  const reqIdRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Robustly find video and get duration
  const findAndInitVideo = () => {
    const video = document.querySelector('video');
    if (video) {
      videoRef.current = video;

      // Handler for metadata
      const onLoadedMetadata = () => {
        const dur = video.duration;
        if (dur && !isNaN(dur)) {
          // Duration Loaded
          setVideoDuration(Math.round(dur * 10) / 10);
          // Reset trim only if it looks essentially uninitialized (default was 0-3)
          // or valid duration is significantly different?
          // Better to just clamp/init if needed.
          // For now, let's just update the max.
          if (trim.end === 3 && trim.start === 0 && dur > 0) {
            setTrim(0, Math.min(3, dur));
          }
        }
      };

      if (video.readyState >= 1) {
        // Metadata already loaded
        onLoadedMetadata();
      } else {
        video.addEventListener('loadedmetadata', onLoadedMetadata);
      }

      // Ensure play
      void video.play();

      return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
    }

    return;
  };

  useEffect(() => {
    // Attempt immediately and after a tick just in case
    const cleanup = findAndInitVideo();
    const timer = setTimeout(findAndInitVideo, 500); // Fallback check

    isReverseRef.current = false;
    return () => {
      clearTimeout(timer);
      if (cleanup) {
        cleanup();
      }
    };
  }, [videoSrc]);

  useEffect(() => {
    // Main Loop
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === undefined) {
        lastTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const video = videoRef.current;
      if (!video) {
        reqIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Bounds check on Start
      if (video.currentTime <= trim.start + 0.05) {
        // Increased tolerance
        // console.log("Hit Start")
        if (isReverseRef.current) {
          // Finished Reverse leg -> Switch to Forward
          video.currentTime = trim.start;
          isReverseRef.current = false;
          video.playbackRate = 1.0;
          void video.play();
        } else if (video.currentTime < trim.start) {
          // Clamp start if drifting
          video.currentTime = trim.start;
        }
      }

      // Bounds check on End
      if (video.currentTime > trim.end) {
        // console.log("Hit End")
        if (boomerang) {
          // Hit end, go reverse
          isReverseRef.current = true;
          video.pause(); // Pause native playback to take manual control
          // Calculate trim adjustment (simulate frame drop)
          // Assume 30fps = 0.033s per frame
          const trimSeconds = 0.033 * (boomerangFrameTrim + 1);
          video.currentTime = Math.max(trim.start, trim.end - trimSeconds);
        } else {
          // Normal loop
          video.currentTime = trim.start;
          void video.play();
        }
      }

      if (isReverseRef.current) {
        // Manual rewind
        // Calculate new time based on delta
        let newTime = video.currentTime - delta;

        // Soft clamp to start
        if (newTime < trim.start) {
          newTime = trim.start;
        }

        // Apply
        video.currentTime = newTime;
      }

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqIdRef.current) {
        cancelAnimationFrame(reqIdRef.current);
      }
    };
  }, [trim, boomerang, videoSrc]);

  return (
    <Box sx={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
      {/* 1. Cropper Area */}
      <Box sx={{position: 'relative', flex: 1, bgcolor: '#000'}}>
        <Cropper
          video={videoSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setLocalCrop as CropperProps['onCropChange']}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          onMediaLoaded={(mediaSize) => {
            // 1. Fix Duration: Get it from the DOM element directly as it might be missing in mediaSize
            const videoEl = document.querySelector('video.react-easy-crop-media') as HTMLVideoElement;
            if (videoEl) {
              videoRef.current = videoEl;
              // @ts-expect-error: mediaSize.duration is not strictly typed in react-easy-crop but might exist
              const dur = videoEl.duration || mediaSize.duration || 0;
              // console.log('Video Duration Found:', dur);
              setVideoDuration(dur);

              // Only set default trim if it's currently at (0, 3) AND duration is available
              // and we haven't modified it or it's just initialized.
              // Actually, if we're coming back from Result, trim.end might be 3 but trim.start might be 0,
              // which matches our default.
              // A better check: only set if trim.end is 3 and it's more than duration.
              if (trim.start === 0 && trim.end === 3 && dur > 0) {
                setTrim(0, Math.min(3, dur));
              }
            } else {
              // eslint-disable-next-line no-console
              console.error('Video element not found in onMediaLoaded');
            }
          }}
        />
      </Box>

      {/* 2. Controls Area */}
      <Box sx={{p: 3, bgcolor: 'white', borderTop: '1px solid #ddd'}}>
        {/* Timeline Slider */}
        <Typography gutterBottom>
          Trim ({trim.start.toFixed(1)}s - {trim.end.toFixed(1)}s)
        </Typography>
        <Slider
          value={[trim.start, trim.end]}
          max={videoDuration}
          step={0.1}
          onChange={(_, val) => {
            const [s, e] = val as number[];
            setTrim(s, e);
          }}
          valueLabelDisplay="auto"
        />

        {/* Manual Zoom Slider */}
        <Box sx={{mt: 2}}>
          <Typography gutterBottom>Zoom ({zoom.toFixed(1)}x)</Typography>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, val) => setZoom(val as number)}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Error Display */}
        {lastError && (
          <Box
            sx={{mt: 2, p: 3, bgcolor: '#ffebee', color: '#c62828', borderRadius: 1, overflow: 'auto', maxHeight: 200}}
          >
            <Typography variant="caption" component="pre" sx={{whiteSpace: 'pre-wrap'}}>
              {lastError}
            </Typography>
          </Box>
        )}

        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2}}>
          <Box>
            <FormControlLabel
              control={<Checkbox checked={boomerang} onChange={(e) => setBoomerang(e.target.checked)} />}
              label="Boomerang Loop"
            />

            {boomerang && (
              <Box sx={{ml: 3, mb: 2, width: 200}}>
                <Typography variant="caption" color="textSecondary">
                  Trim Frames from Reverse: {boomerangFrameTrim}
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
            <Typography
              color={isValid ? 'green' : 'error'}
              variant="caption"
              sx={{mr: 2, display: 'block', textAlign: 'right'}}
            >
              Total Duration: {effectiveDuration.toFixed(1)}s / 3.0s
            </Typography>

            <Box sx={{display: 'flex', gap: 2}}>
              <Button variant="outlined" onClick={reset} disabled={isProcessing}>
                Back
              </Button>
              <Button variant="contained" disabled={!isValid || isProcessing} onClick={handleExport}>
                {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Create Sticker'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
