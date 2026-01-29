import React, {useMemo} from 'react';
import {Box, Checkbox, FormControlLabel, Slider, Typography} from '@mui/material';

import {useStore} from '../store';

export const SpeedControl: React.FC = () => {
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
      {value: 0, label: '0s'},
      {value: duration, label: `${duration.toFixed(1)}s`},
    ];
  }, [duration]);

  if (!speed.enabled) {
    return (
      <Box sx={{mt: 2}}>
        <FormControlLabel
          control={<Checkbox checked={false} onChange={(e) => setSpeed({enabled: e.target.checked})} />}
          label="Enable Speed Control"
        />
      </Box>
    );
  }

  return (
    <Box sx={{mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1}}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <FormControlLabel
          control={<Checkbox checked={speed.enabled} onChange={(e) => setSpeed({enabled: e.target.checked})} />}
          label="Enable Speed Control"
        />
        <FormControlLabel
          control={<Checkbox checked={speed.fade} onChange={(e) => setSpeed({fade: e.target.checked})} />}
          label="Fade Transition"
        />
      </Box>

      <Box sx={{mt: 2}}>
        <Typography gutterBottom>Speed Factor ({speed.value}x)</Typography>
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
          Speed Range ({speed.range.start.toFixed(2)}s - {speed.range.end.toFixed(2)}s)
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
          Relative to trimmed video
        </Typography>
      </Box>
    </Box>
  );
};
