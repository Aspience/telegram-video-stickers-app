import {Area, Point} from 'react-easy-crop';
import {AlertColor} from '@mui/material/Alert/Alert';
import {create} from 'zustand';

export interface CropState {
  visualPosition: Point;
  cropAreaPixels: Area;
  zoom: number;
}

interface State {
  file: File | null;
  filePath: string | null;
  metadata: unknown | null;
  crop: CropState;
  trim: {start: number; end: number};
  boomerang: boolean;
  isProcessing: boolean;
  processedFile: string | null;
  boomerangFrameTrim: number;
  notification: {message: string; severity: AlertColor} | null;
}

interface Setters {
  setFile: (file: File, path: string, meta: unknown) => void;
  setCrop: (crop: CropState) => void;
  setTrim: (start: number, end: number) => void;
  setBoomerang: (val: boolean) => void;
  setProcessing: (val: boolean) => void;
  setProcessedFile: (path: string | null) => void;
  setBoomerangFrameTrim: (val: number) => void;
  showNotification: (message: string, severity?: AlertColor) => void;
  hideNotification: () => void;
  clearResult: () => void;
  reset: () => void;
}

type AppState = State & Setters;

const initialState: State = {
  file: null,
  filePath: null,
  metadata: null,
  crop: {
    visualPosition: {x: 0, y: 0},
    cropAreaPixels: {x: 0, y: 0, width: 512, height: 512},
    zoom: 1,
  },
  trim: {start: 0, end: 3},
  boomerang: false,
  isProcessing: false,
  processedFile: null,
  boomerangFrameTrim: 1,
  notification: null,
};

export const useStore = create<AppState>((set) => ({
  ...initialState,
  setFile: (file, path, meta) => set({file, filePath: path, metadata: meta}),
  setCrop: (crop) => set({crop}),
  setTrim: (start, end) => set({trim: {start, end}}),
  setBoomerang: (val) => set({boomerang: val}),
  setProcessedFile: (path) => set({processedFile: path}),
  setBoomerangFrameTrim: (val) => set({boomerangFrameTrim: val}),
  setProcessing: (val) => set({isProcessing: val}),
  showNotification: (message, severity = 'info') => set({notification: {message, severity}}),
  hideNotification: () => set({notification: null}),
  clearResult: () => set({processedFile: null}),
  reset: () => set({...initialState}),
}));
