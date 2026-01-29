import React, {useEffect, useRef} from 'react';

import {SpeedState} from '../store';

interface UsePreviewControllerProps {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  videoSrc: string | undefined;
  trim: {start: number; end: number};
  boomerang: boolean;
  boomerangFrameTrim: number;
  speed: SpeedState;
}

export const usePreviewController = ({
  videoRef,
  videoSrc,
  trim,
  boomerang,
  boomerangFrameTrim,
  speed,
}: UsePreviewControllerProps) => {
  const isReversingRef = useRef(false);
  const animationFrameIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>();

  // Reset state when file changes
  useEffect(() => {
    isReversingRef.current = false;
    lastFrameTimeRef.current = undefined;

    // Reset to start when video source changes
    if (videoRef.current) {
      videoRef.current.currentTime = trim.start;
      videoRef.current.playbackRate = 1;
    }
  }, [videoSrc]);

  // Main animation loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastFrameTimeRef.current === undefined) {
        lastFrameTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      const video = videoRef.current;

      // If video is not ready, continue loop
      if (!video) {
        animationFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // --- Speed Control Logic (Forward Playback Only) ---
      if (!isReversingRef.current && speed.enabled) {
        // Calculate current time relative to trim start
        const relativeTime = video.currentTime - trim.start;
        const {start: rStart, end: rEnd} = speed.range;

        if (relativeTime >= rStart && relativeTime <= rEnd) {
          if (speed.fade) {
            // Linear Ramp: 1.0 -> Target -> 1.0 logic?
            // "The video smoothly slows down in the specified area"
            // Implementation: Ramp from 1.0 (at rStart) to Value (at rEnd)?
            // OR Ramp from 1.0 to Value to 1.0?
            // "on the specified range" likely means the range IS the transition or the effect area.
            // Let's implement a ramp from 1.0 to Target over the range.
            // WAIT, if it ramps to Target over the range, what happens after?
            // Usually "Fade" implies mixing.
            // Let's stick to the plan: "Fade" = Smooth ramp.
            // But if we ramp 1->Target, we are at Target speed at the end.
            // Let's try: Ramp from 1.0 to Target over the duration of the range.
            const rangeDuration = rEnd - rStart;
            if (rangeDuration > 0) {
              const progress = (relativeTime - rStart) / rangeDuration;
              // Linear interpolation of rate
              // rate = 1 + (target - 1) * progress
              const newRate = 1 + (speed.value - 1) * progress;
              video.playbackRate = Math.max(0.1, newRate); // Safety clamp
            }
          } else {
            // Constant speed in range
            video.playbackRate = speed.value;
          }
        } else {
          // Outside range
          video.playbackRate = 1.0;
        }
      } else {
        // Reset rate if speed disabled or reversing
        // (Reverse need to handle rate manually in the delta logic basically?
        // Actually current reverse logic does MANUAL time updates, so playbackRate doesn't affect it.
        // But we should visually sync expectations)
        video.playbackRate = 1.0;
      }

      // --- 1. Start Bound Check ---
      // Add small tolerance (0.05s) to avoid skipping exact start
      if (video.currentTime <= trim.start + 0.05) {
        if (isReversingRef.current) {
          // Finished reversing -> Switch to forward playback
          video.currentTime = trim.start;
          isReversingRef.current = false;
          // video.playbackRate = 1.0; // Handled above next frame
          void video.play();
        } else if (video.currentTime < trim.start) {
          // Correct drift if video accidentally goes before start
          video.currentTime = trim.start;
        }
      }

      // --- 2. End Bound Check ---
      if (video.currentTime > trim.end) {
        if (boomerang) {
          // Reached end -> Enable REVERSE mode
          isReversingRef.current = true;
          video.pause(); // Pause native player to handle rewind manually

          // Calculate bounce offset (emulating frame drop at turnaround)
          // 0.033s is approx 1 frame at 30fps
          const trimSeconds = 0.033 * (boomerangFrameTrim + 1);
          video.currentTime = Math.max(trim.start, trim.end - trimSeconds);
        } else {
          // Standard Loop (if boomerang is off)
          video.currentTime = trim.start;
          void video.play();
        }
      }

      // --- 3. Reverse Logic (Manual Rewind) ---
      if (isReversingRef.current) {
        // Manually rewind time
        // Apply speed in reverse too?
        // User didn't specify, but Boomerang usually mirrors.
        // If we slowed down forward, we should slow down reverse?
        // Let's apply the SAME speed logic for consistency.

        let currentSpeed = 1.0;
        if (speed.enabled) {
          const relativeTime = video.currentTime - trim.start;
          const {start: rStart, end: rEnd} = speed.range;
          if (relativeTime >= rStart && relativeTime <= rEnd) {
            if (speed.fade) {
              const rangeDuration = rEnd - rStart;
              if (rangeDuration > 0) {
                const progress = (relativeTime - rStart) / rangeDuration;
                currentSpeed = 1 + (speed.value - 1) * progress;
              }
            } else {
              currentSpeed = speed.value;
            }
          }
        }

        let newTime = video.currentTime - delta * currentSpeed;

        // Soft limit to prevent underflow
        if (newTime < trim.start) {
          newTime = trim.start;
        }

        video.currentTime = newTime;
      } else {
        // Safety: if we should be playing forward but video is paused (e.g. after slider drag)
        // and we are within range - play it
        if (video.paused && !boomerang && video.readyState >= 2 && video.currentTime < trim.end) {
          void video.play();
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [trim, boomerang, videoSrc, boomerangFrameTrim, speed]); // Loop restart dependencies
};
