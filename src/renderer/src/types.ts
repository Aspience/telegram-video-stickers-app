import {Area} from 'react-easy-crop';

export interface Api {
  getVideoMeta: (path: string) => Promise<unknown>;
  transcodeVideo: (args: {
    inputPath: string;
    outputPath: string;
    crop: Area;
    trim: {start: number; end: number};
    boomerang: boolean;
    boomerangFrameTrim?: number;
    speed?: {
      enabled: boolean;
      value: number;
      range: {start: number; end: number};
    };
  }) => Promise<string>;
  onProgress: (callback: (progress: number) => void) => void;
  showItemInFolder: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
}
