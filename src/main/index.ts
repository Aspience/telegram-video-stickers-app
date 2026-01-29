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
    const {inputPath, outputPath, crop, trim, boomerang, boomerangFrameTrim = 1, speed} = args;

    // Telegram Requirements:
    // WebM, VP9, No Audio, 512x512 max, 30FPS, <256KB, 3s max

    return new Promise((resolve, reject) => {
      // Force FPS input to avoiding sync issues
      const command = ffmpeg(inputPath).noAudio().fps(30).format('webm').videoCodec('libvpx-vp9');

      // Complex Filters
      const filters: string[] = [];

      // 1. Trim
      const trimStart = trim.start.toFixed(3);
      const trimEnd = trim.end.toFixed(3);
      const duration = trim.end - trim.start;

      // Base stream: Trimmed to user selection.
      // We perform trim FIRST, then speed, then (optionally) boomerang.
      filters.push(
        `[0:v]fps=30,format=yuv420p,trim=start=${trimStart}:end=${trimEnd},setpts=PTS-STARTPTS[base_trimmed]`
      );

      let currentStream = '[base_trimmed]';

      // 2. Speed Control
      if (speed && speed.enabled) {
        // Speed Logic:
        // We split the [base_trimmed] into 3 segments:
        // A: 0 to RangeStart
        // B: RangeStart to RangeEnd (Speed applied here)
        // C: RangeEnd to Duration

        // Range is relative to the TRIMMED video
        const rStart = Math.max(0, speed.range.start);
        const rEnd = Math.min(duration, speed.range.end);

        if (rEnd > rStart) {
          // Split into 3 parts (conceptually)
          // But trim filter takes ABSOLUTE timestamps if used on original,
          // HERE we are using it on [base_trimmed] which starts at 0.

          // Part A (if start > 0)
          let partA = '';
          if (rStart > 0.01) {
            filters.push(`${currentStream}split=3[pre_in][mid_in][post_in]`);
            filters.push(`[pre_in]trim=start=0:end=${rStart},setpts=PTS-STARTPTS[speed_a]`);
            partA = '[speed_a]';
          } else {
            filters.push(`${currentStream}split=2[mid_in][post_in]`);
          }

          // Part B (The Speed Zone)
          const rangeDur = rEnd - rStart;
          const partB = '[speed_b]';

          if (speed.fade) {
            // Fade / Ramp
            // Ramp from 1.0 (at t=0 of this part) to TARGET (at t=end)
            // SetPTS formula: T / Speed(t) integrated
            // If Linear Speed S(t) = 1 + (Target-1)*(t/Dur)
            // Integral(1/(A+Bt)) = (1/B)*ln(A+Bt)
            // A = 1, B = (Target-1)/Dur
            const target = speed.value;
            if (Math.abs(target - 1) < 0.01) {
              // No speed change effectively
              filters.push(`[mid_in]trim=start=${rStart}:end=${rEnd},setpts=PTS-STARTPTS[speed_b]`);
            } else {
              const B = (target - 1) / rangeDur;
              // Formula: (1/B) * ln(1 + B*T)
              // FFmpeg 'setpts' expression uses T (timestamp in seconds)
              // We need to apply trim first relative to start...
              // Actually easier: use 'trim' to isolate part B, resets PTS to 0.
              // Then apply setpts logic.
              const setptsExpr = `(1/${B})*log(1+${B}*T)`;
              filters.push(`[mid_in]trim=start=${rStart}:end=${rEnd},setpts=PTS-STARTPTS[mid_trimmed]`);
              filters.push(`[mid_trimmed]setpts=${setptsExpr}[speed_b]`);
            }
          } else {
            // Constant Speed
            // Speed Factor S. New Duration = Old / S.
            // setpts = PTS * (1/S)
            const factor = 1 / speed.value;
            filters.push(`[mid_in]trim=start=${rStart}:end=${rEnd},setpts=PTS-STARTPTS[mid_trimmed]`);
            filters.push(`[mid_trimmed]setpts=${factor}*PTS[speed_b]`);
          }

          // Part C (if end < duration)
          let partC = '';
          if (rEnd < duration - 0.01) {
            filters.push(`[post_in]trim=start=${rEnd},setpts=PTS-STARTPTS[speed_c]`);
            partC = '[speed_c]';
          }

          // Concat
          const inputs = [partA, partB, partC].filter(Boolean);
          filters.push(`${inputs.join('')}concat=n=${inputs.length}:v=1:a=0:unsafe=1[speed_concat]`);
          // Force FPS after speed changes to ensure consistent frame rate and avoid "sharp" jumps
          filters.push(`[speed_concat]fps=30[speed_out]`);
          currentStream = '[speed_out]';
        }
      }

      // 3. Boomerang & Final Prep
      if (boomerang) {
        // Standard Boomerang Graph:
        // [currentStream] is our "Base".
        // 1. Split
        filters.push(`${currentStream}split[fwd][rev_in]`);

        // 2. Forward Chain: Ensure setpts is reset (redundant but safe for concat)
        filters.push(`[fwd]setpts=PTS-STARTPTS[fwd_out]`);

        // 3. Reverse Chain: Reverse then reset PTS
        // Trim X frame(s) from start of reversed clip to avoid duplicate frame at apex
        const trimReverse = boomerangFrameTrim > 0 ? `,trim=start_frame=${boomerangFrameTrim}` : '';
        filters.push(`[rev_in]reverse${trimReverse},setpts=PTS-STARTPTS[rev_out]`);

        // 4. Concat
        // unsafe=1 helps with minor timestamp mismatches
        filters.push(`[fwd_out][rev_out]concat=n=2:v=1:a=0:unsafe=1[looped]`);
        currentStream = '[looped]';
      } else {
        // Just rename/ensure label matches
        // (If no speed logic ran, 'currentStream' is '[base_trimmed]'. If speed ran, it's '[speed_out]')
        // We don't strictly need to do anything, but let's label it [trimmed] for the crop stage
        // Actually the next stage uses 'stream' variable.
      }

      const stream = currentStream;

      // 4. Crop
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
