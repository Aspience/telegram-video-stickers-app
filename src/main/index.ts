import {electronApp, is, optimizer} from '@electron-toolkit/utils';
import {app, BrowserWindow, ipcMain, net, protocol, session, shell} from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import {join} from 'path';

// Register privileged scheme
protocol.registerSchemesAsPrivileged([
  {scheme: 'local-resource', privileges: {secure: true, standard: true, supportFetchAPI: true, stream: true}},
]);
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';

// Fix for packaged app binaries path
const getBinaryPath = (binaryPath: string) => {
  return binaryPath.replace('app.asar', 'app.asar.unpacked');
};

// Configure FFmpeg
ffmpeg.setFfmpegPath(getBinaryPath(ffmpegPath as string));
ffmpeg.setFfprobePath(getBinaryPath(ffprobePath.path));

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' || process.platform === 'win32'
      ? {icon: join(__dirname, '../../build/icon.png')}
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return {action: 'deny'};
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return `data:video/webm;base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading file:', error);
    throw error;
  }
});

void app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.stickermaker.app');

  // Register local-resource protocol to read files
  // Register local-resource protocol to read files
  // Register local-resource protocol to read files
  session.defaultSession.protocol.handle('local-resource', async (request) => {
    // Strip the protocol
    const rawPath = request.url.replace(/^local-resource:\/\//, '');

    // Decode URI components (e.g. spaces)
    let decodedPath = decodeURIComponent(rawPath);

    // Handle "slash" issues on Windows:
    // If the browser sends "local-resource://C:/..." -> we get "C:/..." (Good)
    // If it sends "local-resource:///C:/..." -> we get "/C:/..." (Bad on Windows fs)
    if (process.platform === 'win32' && decodedPath.startsWith('/') && !decodedPath.startsWith('//')) {
      decodedPath = decodedPath.slice(1);
    }

    // Normalize forward slashes if needed, though Node usually handles mixed
    // Use net.fetch with file:// protocol
    // pathToFileURL handles all encoding/escaping for us
    const {pathToFileURL} = await import('url');
    const fileUrl = pathToFileURL(decodedPath).toString();

    return net.fetch(fileUrl);
  });

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  // IPC: Get Video Metadata
  ipcMain.handle('get-video-meta', async (_, filePath) => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  });

  // IPC: Show in folder
  ipcMain.handle('show-item-in-folder', async (_, filePath) => {
    // Ensure path separators are normalized for Windows if needed, though shell usually handles it.
    // Sometimes converting / to \ helps on Windows.
    const normalizedPath = process.platform === 'win32' ? filePath.replace(/\//g, '\\') : filePath;
    shell.showItemInFolder(normalizedPath);
  });

  // IPC: Transcode Video
  ipcMain.handle('transcode-video', async (_, args) => {
    const {inputPath, outputPath, crop, trim, boomerang, boomerangFrameTrim = 1} = args;

    // Telegram Requirements:
    // WebM, VP9, No Audio, 512x512 max, 30FPS, <256KB, 3s max

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath).noAudio().fps(30).format('webm').videoCodec('libvpx-vp9');

      // Complex Filters
      const filters: string[] = [];

      // 1. Trim
      // Format to 3 decimals to ensure clean FFmpeg args
      const trimStart = trim.start.toFixed(3);
      const trimEnd = trim.end.toFixed(3);

      // We will perform trim via filters to handle boomerang correctly
      let stream = '[0:v]';

      if (boomerang) {
        // Standard Boomerang Graph:
        // 1. Force FPS & Format -> Trim -> base
        // We force fps=30 FIRST to align timebases, preventing black frame gaps
        // Use explicit start= and end= syntax to avoid "Invalid argument" with positional args
        filters.push(`[0:v]fps=30,format=yuv420p,trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS[base]`);

        // 2. Split
        filters.push(`[base]split[fwd][rev_in]`);

        // 3. Forward Chain: Ensure setpts is reset (redundant but safe for concat)
        filters.push(`[fwd]setpts=PTS-STARTPTS[fwd_out]`);

        // 4. Reverse Chain: Reverse then reset PTS
        // Trim X frame(s) from start of reversed clip to avoid duplicate frame at apex
        // Use start_frame to skip exactly N frames
        const trimReverse = boomerangFrameTrim > 0 ? `,trim=start_frame=${boomerangFrameTrim}` : '';
        filters.push(`[rev_in]reverse${trimReverse},setpts=PTS-STARTPTS[rev_out]`);

        // 5. Concat
        // unsafe=1 helps with minor timestamp mismatches
        filters.push(`[fwd_out][rev_out]concat=n=2:v=1:a=0:unsafe=1[looped]`);
        stream = '[looped]';
      } else {
        filters.push(`[0:v]trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS[trimmed]`);
        stream = '[trimmed]';
      }

      // 2. Crop
      // React-easy-crop gives x, y, width, height (cropAreaPixels)
      // Ensure integers
      const cropW = Math.round(crop.width);
      const cropH = Math.round(crop.height);
      const cropX = Math.round(crop.x);
      const cropY = Math.round(crop.y);
      filters.push(`${stream}crop=${cropW}:${cropH}:${cropX}:${cropY}[cropped]`);

      // 3. Scale
      filters.push(`[cropped]scale=512:512:force_original_aspect_ratio=decrease[out]`);

      const filterString = filters.join('; ');
      command.complexFilter(filters, 'out');

      // Bitrate constraint for 256KB file size
      // 256KB = 2048 kilobits.
      // Max duration is 3s.
      // Max bitrate = 2048 / 3 ~= 680k.
      // Using 500k to be safe + overhead.
      command.outputOptions([
        '-b:v 500k',
        '-minrate 300k',
        '-maxrate 500k',
        '-bufsize 1000k',
        '-crf 30', // VP9 Quality factor
      ]);

      command.on('end', () => resolve(outputPath));
      command.on('error', (err, _stdout, stderr) => {
        // eslint-disable-next-line no-console
        console.error('An error occurred: ' + err.message);
        // eslint-disable-next-line no-console
        console.error('ffmpeg stderr: ' + stderr);
        // pass stderr AND filter graph to renderer for debugging
        const errorMsg = err.message + '\\n\\nFilters: ' + filterString + '\\n\\nFFmpeg Log:\\n' + stderr;
        reject(new Error(errorMsg));
      });

      command.save(outputPath);
    });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
