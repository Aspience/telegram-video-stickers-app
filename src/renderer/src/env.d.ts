/// <reference types="vite/client" />

import {Api} from './types';

interface Window {
  electron: import('@electron-toolkit/preload').ElectronAPI;
  api: Api;
}
