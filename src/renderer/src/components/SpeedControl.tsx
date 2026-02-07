import React, {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Box, Checkbox, FormControlLabel, Slider, Typography} from '@mui/material';

import {useStore} from '../store';

export const SpeedControl: React.FC = () => {
  const {t} = useTranslation();
  const {speed, setSpeed, trim} = useStore((state) => state);
  const {start, end} = trim;
  const duration = end - start;

  // Ensure speed range is within total trimmed duration
  // If trim changes, we should probably clamp these, but for now we clamp in render
  const safeRangeStart = Math.min(speed.range.start, duration);
  const safeRangeEnd = Math.min(speed.range.end, duration);

  const handleRangeChange = (_: Event, newValue: number | number[]) => {
    const [newStart, newEnd] = newValue as number[];
    setSpeed({range: {start: newStart, end: newEnd}});
  };

  const marks = useMemo(() => {
    return [
      {value: 0, label: `0${t('Common.seconds')}`},
      {value: duration, label: `${duration.toFixed(1)}${t('Common.seconds')}`},
    ];
  }, [duration, t]);

  if (!speed.enabled) {
    return (
      <Box sx={{mt: 2}}>
        <FormControlLabel
          control={<Checkbox checked={false} onChange={(e) => setSpeed({enabled: e.target.checked})} />}
          label={t('SpeedControl.enable')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1}}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <FormControlLabel
          control={<Checkbox checked={speed.enabled} onChange={(e) => setSpeed({enabled: e.target.checked})} />}
          label={t('SpeedControl.enable')}
        />
      </Box>

      <Box sx={{mt: 2}}>
        <Typography gutterBottom>
          {t('SpeedControl.speed')} ({speed.value}x)
        </Typography>
        <Slider
          value={speed.value}
          min={0.25}
          max={2}
          step={0.05}
          marks={[
            {value: 0.25, label: '0.25x'},
            {value: 1, label: '1x'},
            {value: 2, label: '2x'},
          ]}
          onChange={(_, val) => setSpeed({value: val as number})}
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{mt: 2}}>
        <Typography gutterBottom>
          {t('SpeedControl.speedRange')} ({speed.range.start.toFixed(2)}
          {t('Common.seconds')} - {speed.range.end.toFixed(2)}
          {t('Common.seconds')})
        </Typography>
        <Slider
          value={[safeRangeStart, safeRangeEnd]}
          min={0}
          max={duration}
          step={0.1}
          marks={marks}
          onChange={handleRangeChange}
          valueLabelDisplay="auto"
        />
        <Typography variant="caption" color="textSecondary">
          {t('SpeedControl.relativeToTrimmed')}
        </Typography>
      </Box>
    </Box>
  );
};
