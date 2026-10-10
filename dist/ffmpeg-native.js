import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ffmpegArgs, prepareInputs } from './audio-processing.js';
const execFileAsync = promisify(execFile);
/** Native FFmpeg adapter for Node.js. No shell interpretation of arguments. */
export function createNativeAudioProcessor(options = {}) {
    return {
        backend: 'native',
        async process(request) {
            const filenames = prepareInputs(request);
            const folder = await mkdtemp(join(tmpdir(), 'mvsep-audio-'));
            try {
                await Promise.all(request.inputs.map((input, index) => writeFile(join(folder, filenames[index]), input.data)));
                const args = ffmpegArgs(request.effect, filenames, 'output.wav');
                await execFileAsync(options.executable ?? 'ffmpeg', args, {
                    cwd: folder, signal: request.signal, timeout: 300_000, maxBuffer: 1_000_000,
                });
                return new Uint8Array(await readFile(join(folder, 'output.wav')));
            }
            finally {
                await rm(folder, { recursive: true, force: true });
            }
        },
    };
}
//# sourceMappingURL=ffmpeg-native.js.map