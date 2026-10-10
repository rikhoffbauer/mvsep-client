/** Cross-platform, deterministic FFmpeg audio operations. All inputs are in-memory files. */
export type AudioEffect =
  | { type: 'mix'; weights?: readonly number[] }
  | { type: 'subtract' }
  | { type: 'invert' }
  | { type: 'gain'; decibels: number }
  | { type: 'lowpass' | 'highpass'; frequency: number }
  | { type: 'trim'; start: number; duration?: number };

export interface AudioBufferInput {
  /** Audio content, typically a WAV, FLAC, or MP3. */
  data: Uint8Array;
  /** Extension used to help FFmpeg detect container type, not a filesystem path. */
  extension?: string;
}
export interface AudioProcessingRequest {
  effect: AudioEffect;
  inputs: readonly AudioBufferInput[];
  signal?: AbortSignal;
}
export interface AudioProcessor {
  readonly backend: 'native' | 'wasm';
  process(request: AudioProcessingRequest): Promise<Uint8Array>;
  dispose?(): Promise<void>;
}
function finite(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}
/** Sanitized FFmpeg argv shared by the browser wasm and native adapters. */
export function ffmpegArgs(effect: AudioEffect, filenames: readonly string[], output: string): string[] {
  const n = filenames.length;
  if (n < 1 || n > 16 || filenames.some(name => !/^input-\d+\.(wav|flac|mp3|ogg|m4a|aac|aif|aiff|webm)$/i.test(name)) ||
      !/^output\.wav$/.test(output)) throw new TypeError('Expected 1–16 input audio files and one output WAV');
  if ((effect.type === 'mix' && n < 2) || (effect.type === 'subtract' && n !== 2) ||
      (!['mix', 'subtract'].includes(effect.type) && n !== 1))
    throw new TypeError(effect.type + ' requires ' + (effect.type === 'mix' ? 'at least two' : effect.type === 'subtract' ? 'exactly two' : 'exactly one') + ' inputs');
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y'];
  filenames.forEach(file => args.push('-i', file));
  const chain = filenames.map((_, i) => '[' + i + ':a:0]');
  let graph: string;
  switch (effect.type) {
    case 'mix': {
      const weights = effect.weights ?? Array(n).fill(1);
      if (weights.length !== n || weights.some(w => !finite(w, -16, 16)))
        throw new TypeError('Invalid mix weights');
      graph = chain.join('') + 'amix=inputs=' + n + ':duration=longest:dropout_transition=0:normalize=0:weights=' +
        weights.join(' ') + '[out]';
      break;
    }
    case 'subtract':
      // Negative amix weight is a 180° phase inversion of input 2.
      // Input recordings must be time-aligned; subtraction cannot auto-align them.
      graph = chain.join('') + 'amix=inputs=2:duration=longest:dropout_transition=0:normalize=0:weights=1 -1[out]';
      break;
    case 'invert':
      graph = chain[0] + 'volume=-1[out]';
      break;
    case 'gain':
      if (!finite(effect.decibels, -96, 48)) throw new TypeError('Gain outside -96…48 dB');
      graph = chain[0] + 'volume=' + effect.decibels + 'dB[out]';
      break;
    case 'lowpass':
    case 'highpass':
      if (!finite(effect.frequency, 20, 20_000)) throw new TypeError('Frequency outside 20…20,000 Hz');
      graph = chain[0] + effect.type + '=f=' + effect.frequency + '[out]';
      break;
    case 'trim':
      if (!finite(effect.start, 0, 86_400) || (effect.duration !== undefined && !finite(effect.duration, 0.001, 86_400)))
        throw new TypeError('Invalid trim range');
      graph = chain[0] + 'atrim=start=' + effect.start +
        (effect.duration === undefined ? '' : ':duration=' + effect.duration) + ',asetpts=PTS-STARTPTS[out]';
  }
  args.push('-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_s16le', '-f', 'wav', output);
  return args;
}
export function prepareInputs(request: AudioProcessingRequest): string[] {
  if (request.signal?.aborted) throw request.signal.reason ?? Error('Audio processing aborted');
  const filenames = request.inputs.map((item, index) => {
    const ext = (item.extension ?? 'wav').replace(/^\./, '').toLowerCase();
    if (!/^(wav|flac|mp3|ogg|m4a|aac|aif|aiff|webm)$/.test(ext) ||
        !(item.data instanceof Uint8Array) || !item.data.byteLength)
      throw new TypeError('Invalid input audio file #' + (index + 1));
    return 'input-' + index + '.' + ext;
  });
  ffmpegArgs(request.effect, filenames, 'output.wav');
  return filenames;
}
/** Select the browser WASM adapter or native server adapter without eagerly loading either. */
export async function createAudioProcessor(): Promise<AudioProcessor> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const { createBrowserAudioProcessor } = await import('./ffmpeg-browser.js');
    return createBrowserAudioProcessor();
  }
  // Keep the Node-only adapter outside browser bundles. Vite must not eagerly
  // resolve node:fs, node:child_process, etc. when building the playground.
  const nativeAdapterPath = './ffmpeg-native.js';
  const { createNativeAudioProcessor } = await import(/* @vite-ignore */ nativeAdapterPath);
  return createNativeAudioProcessor();
}
