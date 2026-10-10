/** Cross-platform, deterministic FFmpeg audio operations. All inputs are in-memory files. */
export type AudioEffect = {
    type: 'mix';
    weights?: readonly number[];
} | {
    type: 'subtract';
} | {
    type: 'invert';
} | {
    type: 'gain';
    decibels: number;
} | {
    type: 'lowpass' | 'highpass';
    frequency: number;
} | {
    type: 'trim';
    start: number;
    duration?: number;
};
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
/** Sanitized FFmpeg argv shared by the browser wasm and native adapters. */
export declare function ffmpegArgs(effect: AudioEffect, filenames: readonly string[], output: string): string[];
export declare function prepareInputs(request: AudioProcessingRequest): string[];
/** Select the browser WASM adapter or native server adapter without eagerly loading either. */
export declare function createAudioProcessor(): Promise<AudioProcessor>;
//# sourceMappingURL=audio-processing.d.ts.map