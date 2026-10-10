import type { AudioProcessor } from './audio-processing.js';
export interface BrowserFfmpegOptions {
    /** Same-origin FFmpeg core JS path, or CDN URL; defaults to published single-thread core. */
    coreURL?: string;
    /** Companion WebAssembly binary URL. */
    wasmURL?: string;
}
/** Browser-only adapter. Uses the single-thread WASM core, so COOP/COEP isn't required. */
export declare function createBrowserAudioProcessor(options?: BrowserFfmpegOptions): AudioProcessor;
//# sourceMappingURL=ffmpeg-browser.d.ts.map