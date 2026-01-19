import {electronAPI} from '@electron-toolkit/preload';
import {contextBridge, ipcRenderer} from 'electron';

import {Api} from '../renderer/src/types';

const api: Api = {
  getVideoMeta: (path: string) => ipcRenderer.invoke('get-video-meta', path),
  transcodeVideo: (args: unknown) => ipcRenderer.invoke('transcode-video', args),
  onProgress: (callback: (progress: number) => void) =>
    ipcRenderer.on('conversion-progress', (_event, value) => callback(value)),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
