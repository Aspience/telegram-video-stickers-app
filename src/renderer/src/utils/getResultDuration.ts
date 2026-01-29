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
      let newRangeDuration = rangeDuration;

      if (speed.fade) {
        // Ramp Logic:
        // Speed linearly ramps from 1.0 to Target Speed over the range.
        // Formula for Time taken: T_new = (T_old / (Target - 1)) * ln(Target)
        // Check for S=1 case to avoid div/0

        // Wait, why ln(Target)?
        // Previous derivation: Integral(1/(1 + k*t)) dt
        // k = (Target - 1) / T
        // Result = (1/k) * ln(1 + k*T) = (T / (Target - 1)) * ln(1 + (Target-1)) = (T / (Target - 1)) * ln(Target)
        // Yes.

        const target = speed.value;
        if (Math.abs(target - 1) < 0.001) {
          newRangeDuration = rangeDuration;
        } else {
          // If target < 0? speed is clamped > 0, so ln is safe.
          newRangeDuration = (rangeDuration / (target - 1)) * Math.log(target);
        }
      } else {
        // Constant Speed
        // T_new = T_old / Speed
        newRangeDuration = rangeDuration / speed.value;
      }

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
