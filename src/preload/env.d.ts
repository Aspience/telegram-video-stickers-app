import {ElectronAPI} from '@electron-toolkit/preload';

import {Api} from '../renderer/src/types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: Api;
  }
}
