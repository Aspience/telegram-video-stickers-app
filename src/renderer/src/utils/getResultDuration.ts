import {SpeedState} from '../store';

interface GetResultDurationParams {
  trim: {start: number; end: number};
  boomerang: boolean;
  speed: SpeedState;
}

export const getResultDuration = ({trim, boomerang, speed}: GetResultDurationParams): number => {
  const duration = trim.end - trim.start;

  let calculatedDuration = duration;

  // Apply Speed Control
  if (speed.enabled) {
    const {start: rStart, end: rEnd} = speed.range;

    // Range is relative to the start of the trimmed clip (0 to duration)
    const validStart = Math.max(0, Math.min(duration, rStart));
    const validEnd = Math.max(0, Math.min(duration, rEnd));
    const rangeDuration = validEnd - validStart;

    if (rangeDuration > 0) {
      // 3 Parts:
      // Part A: 0 to validStart -> Duration = validStart (No change)
      // Part B: validStart to validEnd -> Duration depends on speed
      // Part C: validEnd to duration -> Duration = duration - validEnd (No change)

      // Calculate new time for Part B
      const newRangeDuration = rangeDuration / speed.value;

      calculatedDuration = validStart + newRangeDuration + (duration - validEnd);
    }
  }

  // Apply Boomerang
  if (boomerang) {
    calculatedDuration *= 2;
  }

  // Round to 2 decimal places to match UI and avoid floating point artifacts
  return Math.round(calculatedDuration * 100) / 100;
};
