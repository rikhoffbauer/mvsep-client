import { ffmpegArgs, prepareInputs } from './audio-processing.js';
import type { AudioProcessor, AudioProcessingRequest } from './audio-processing.js';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export interface BrowserFfmpegOptions {
  /** Same-origin FFmpeg core JS path, or CDN URL; defaults to published single-thread core. */
  coreURL?: string;
  /** Companion WebAssembly binary URL. */
  wasmURL?: string;
}
/** Browser-only adapter. Uses the single-thread WASM core, so COOP/COEP isn't required. */
export function createBrowserAudioProcessor(options: BrowserFfmpegOptions = {}): AudioProcessor {
  let engine: FFmpeg | undefined;
  let loading: Promise<FFmpeg> | undefined;
  const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
  async function load(): Promise<FFmpeg> {
    if (engine?.loaded) return engine;
    if (loading) return loading;
    loading = (async () => {
      const ffmpeg = new FFmpeg();
      const coreURL = options.coreURL ?? base + '/ffmpeg-core.js';
      const wasmURL = options.wasmURL ?? base + '/ffmpeg-core.wasm';
      // The FFmpeg worker must load same-origin code: wrap permitted external
      // asset URLs in local object URLs (as in the official ffmpeg.wasm docs).
      const wrap = async (url: string, mime: string) => {
        if (new URL(url, location.href).origin === location.origin) return url;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Cannot fetch FFmpeg core: HTTP ' + response.status);
        const blob = new Blob([await response.arrayBuffer()], { type: mime });
        return URL.createObjectURL(blob);
      };
      const wrapped = await Promise.all([wrap(coreURL, 'text/javascript'), wrap(wasmURL, 'application/wasm')]);
      try {
        await ffmpeg.load({ coreURL: wrapped[0], wasmURL: wrapped[1] });
      } finally {
        for (const value of wrapped) if (value.startsWith('blob:')) URL.revokeObjectURL(value);
      }
      engine = ffmpeg;
      return ffmpeg;
    })().catch(error => { loading = undefined; throw error; });
    return loading;
  }
  return {
    backend: 'wasm',
    async process(request: AudioProcessingRequest): Promise<Uint8Array> {
      const filenames = prepareInputs(request);
      const ffmpeg = await load();
      if (request.signal?.aborted) throw request.signal.reason ?? Error('Audio processing aborted');
      const onAbort = () => { ffmpeg.terminate(); engine = undefined; loading = undefined; };
      request.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        for (let i = 0; i < filenames.length; i++) {
          await ffmpeg.writeFile(filenames[i]!, request.inputs[i]!.data);
        }
        const code = await ffmpeg.exec(ffmpegArgs(request.effect, filenames, 'output.wav'));
        if (code !== 0) throw new Error('FFmpeg.wasm exited with code ' + code);
        const data = await ffmpeg.readFile('output.wav');
        if (!(data instanceof Uint8Array)) throw new Error('FFmpeg did not produce a WAV file');
        return new Uint8Array(data);
      } finally {
        request.signal?.removeEventListener('abort', onAbort);
        await Promise.allSettled([...filenames, 'output.wav'].map(async file => { await ffmpeg.deleteFile(file); }));
      }
    },
    async dispose() { engine?.terminate(); engine = undefined; loading = undefined; },
  };
}
