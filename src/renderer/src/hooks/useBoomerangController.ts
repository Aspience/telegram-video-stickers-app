import React, {useEffect, useRef} from 'react';

interface UseBoomerangControllerProps {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  videoSrc: string | undefined;
  trim: {start: number; end: number};
  boomerang: boolean;
  boomerangFrameTrim: number;
}

export const useBoomerangController = ({
  videoRef,
  videoSrc,
  trim,
  boomerang,
  boomerangFrameTrim,
}: UseBoomerangControllerProps) => {
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

      // --- 1. Start Bound Check ---
      // Add small tolerance (0.05s) to avoid skipping exact start
      if (video.currentTime <= trim.start + 0.05) {
        if (isReversingRef.current) {
          // Finished reversing -> Switch to forward playback
          video.currentTime = trim.start;
          isReversingRef.current = false;
          video.playbackRate = 1.0;
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
        let newTime = video.currentTime - delta;

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
  }, [trim, boomerang, videoSrc, boomerangFrameTrim]); // Loop restart dependencies
};
