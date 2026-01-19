import {Area, Point} from 'react-easy-crop';
import {create} from 'zustand';

interface AppState {
  file: File | null;
  filePath: string | null;
  metadata: unknown | null;
  crop: Point & Area & {zoom?: number};
  trim: {start: number; end: number};
  boomerang: boolean;
  isProcessing: boolean;
  processedFile: string | null;
  boomerangFrameTrim: number;

  setFile: (file: File, path: string, meta: unknown) => void;
  setCrop: (crop: Point & Area & {zoom?: number}) => void;
  setTrim: (start: number, end: number) => void;
  setBoomerang: (val: boolean) => void;
  setProcessing: (val: boolean) => void;
  setProcessedFile: (path: string | null) => void;
  setBoomerangFrameTrim: (val: number) => void;
  clearResult: () => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  file: null,
  filePath: null,
  metadata: null,
  crop: {x: 0, y: 0, width: 512, height: 512, zoom: 1},
  trim: {start: 0, end: 3},
  boomerang: false,
  isProcessing: false,
  processedFile: null,
  boomerangFrameTrim: 1,

  setFile: (file, path, meta) => set({file, filePath: path, metadata: meta}),
  setCrop: (crop) => set({crop}),
  setTrim: (start, end) => set({trim: {start, end}}),
  setBoomerang: (val) => set({boomerang: val}),
  setProcessedFile: (path) => set({processedFile: path}),
  setBoomerangFrameTrim: (val) => set({boomerangFrameTrim: val}),
  setProcessing: (val) => set({isProcessing: val}),
  clearResult: () => set({processedFile: null}),
  reset: () => set({file: null, filePath: null, processedFile: null}),
}));
