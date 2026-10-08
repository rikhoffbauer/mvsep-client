import { link, rename, rm, open } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import {
  MvsepAbortError, MvsepError, MvsepHttpError, MvsepTimeoutError,
} from "./errors.js";
import { Semaphore, TokenBucketRateLimiter } from "./rate-limiter.js";
import type { SeparationResult } from "./types.js";
import type {
  DownloadFileOptions, DownloadReceipt, DownloadedFile, OutputDownloadOptions,
  OutputManifest, StreamDownloadOptions,
} from "./extended-types.js";
import { getOutputFiles, safeOutputFilename } from "./metadata.js";

export interface TransferSettings {
  fetchImpl: typeof fetch;
  limiter: TokenBucketRateLimiter;
  semaphore: Semaphore;
  timeoutMs: number;
  maxAttempts: number;
  baseDelayMs: number;
}

function retryAfter(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const parsed = Date.parse(header);
  return Number.isFinite(parsed) ? Math.max(0, parsed - Date.now()) : null;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
async function raceAbort<T>(promise: Promise<T>, signal: AbortSignal, cancel?: () => void): Promise<T> {
  if (signal.aborted) throw signal.reason;
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); try { cancel?.(); } catch { /* best effort */ } reject(signal.reason); };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(value => { signal.removeEventListener("abort", abort); resolve(value); },
      error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

export class TransferManager {
  constructor(private readonly config: TransferSettings) {}

  /**
   * Backpressure-aware download. GETs can retry before any bytes are written.
   * Partial-transfer failures never silently replay into an already-written stream.
   */
  async downloadToStream(url: string, writable: WritableStream<Uint8Array>, options: StreamDownloadOptions = {}): Promise<DownloadReceipt> {
    const timeout = options.timeoutMs ?? this.config.timeoutMs;
    if (!(timeout === Infinity || (Number.isFinite(timeout) && timeout >= 0)))
      throw new RangeError("Invalid transfer timeout");
    const maxBytes = options.maxBytes ?? Infinity;
    if (!(maxBytes === Infinity || (Number.isFinite(maxBytes) && maxBytes >= 0)))
      throw new RangeError("maxBytes must be nonnegative");
    const attempts = options.maxAttempts ?? this.config.maxAttempts;
    if (!Number.isSafeInteger(attempts) || attempts < 1) throw new RangeError("maxAttempts must be positive");

    const controller = new AbortController();
    const fromParent = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", fromParent, { once: true });
    if (options.signal?.aborted) fromParent();
    let timedOut = false;
    const timer = Number.isFinite(timeout) && timeout > 0 ? setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException("Download timed out", "TimeoutError"));
    }, timeout) : undefined;
    const signal = controller.signal;
    let release: (() => void) | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
    let completed = false;
    let loaded = 0;
    try {
      writer = writable.getWriter();
      let response: Response | undefined;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        if (signal.aborted) throw signal.reason;
        await this.config.limiter.acquire(signal);
        release = await this.config.semaphore.acquire(signal);
        try {
          response = await raceAbort(this.config.fetchImpl(url, { method: "GET", signal }), signal);
        } catch (error) {
          release(); release = undefined;
          if (signal.aborted || attempt === attempts) throw error;
          await wait(this.config.baseDelayMs * 2 ** (attempt - 1), signal);
          continue;
        }
        if (!response.ok) {
          const retryable = [408, 425, 429, 500, 502, 503, 504].includes(response.status);
          const delay = Math.max(retryAfter(response) ?? 0, this.config.baseDelayMs * 2 ** (attempt - 1));
          const status = response.status;
          await response.body?.cancel().catch(() => {});
          release(); release = undefined;
          if (retryable && attempt < attempts) {
            await wait(delay, signal);
            continue;
          }
          throw new MvsepHttpError("Download returned HTTP " + status, {
            url, method: "GET", status, retryable,
          });
        }
        break;
      }
      if (!response) throw new MvsepError("No download response received", { url });
      const rawTotal = response.headers.get("content-length");
      const declaredTotal = rawTotal === null ? NaN : Number(rawTotal);
      // Fetch may transparently decompress encoded responses; encoded Content-Length
      // is not a valid checksum of the decoded stream.
      const total = !response.headers.has("content-encoding") &&
        Number.isSafeInteger(declaredTotal) && declaredTotal >= 0 ? declaredTotal : undefined;
      if (total !== undefined && total > maxBytes)
        throw new RangeError("Download exceeds maxBytes");
      if (!response.body) {
        const bytes = new Uint8Array(await raceAbort(response.arrayBuffer(), signal));
        if (bytes.byteLength > maxBytes) throw new RangeError("Download exceeds maxBytes");
        await raceAbort(writer.write(bytes), signal);
        loaded = bytes.byteLength;
        options.onProgress?.({ loaded, ...(total !== undefined ? { total, fraction: 1 } : {}) });
      } else {
        reader = response.body.getReader();
        while (true) {
          const currentReader = reader;
          const chunk = await raceAbort(currentReader.read(), signal, () => { void currentReader.cancel().catch(() => {}); });
          if (chunk.done) break;
          if (!chunk.value?.byteLength) continue;
          if (loaded + chunk.value.byteLength > maxBytes) throw new RangeError("Download exceeds maxBytes");
          await raceAbort(writer.write(chunk.value), signal, () => { void currentReader.cancel().catch(() => {}); });
          loaded += chunk.value.byteLength;
          options.onProgress?.({ loaded, ...(total !== undefined ?
            { total, fraction: total === 0 ? 1 : Math.min(1, loaded / total) } : {}) });
        }
      }
      if (total !== undefined && total !== loaded)
        throw new MvsepError("Downloaded byte count differs from Content-Length", { url, method: "GET", retryable: true });
      await raceAbort(writer.close(), signal);
      completed = true;
      return { loaded, ...(total !== undefined ? { total } : {}) };
    } catch (cause) {
      if (timedOut) throw new MvsepTimeoutError("Download timed out", { cause, url, method: "GET" });
      if (options.signal?.aborted) throw new MvsepAbortError("Download aborted", { cause, url, method: "GET" });
      if (cause instanceof MvsepError) throw cause;
      throw new MvsepError("Download failed", { cause, url, method: "GET", retryable: true });
    } finally {
      if (reader) {
        if (!completed) await reader.cancel().catch(() => {});
        try { reader.releaseLock(); } catch { /* already unlocked */ }
      }
      if (writer) {
        if (!completed) await writer.abort().catch(() => {});
        writer.releaseLock();
      }
      release?.();
      if (timer !== undefined) clearTimeout(timer);
      options.signal?.removeEventListener("abort", fromParent);
    }
  }

  async download(url: string, options: StreamDownloadOptions = {}): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    const stream = new WritableStream<Uint8Array>({
      write(chunk) { chunks.push(chunk); total += chunk.byteLength; },
    });
    // Existing download() returns bytes in memory; guard against accidental multi-GB allocations.
    await this.downloadToStream(url, stream, { maxBytes: 256 * 1024 * 1024, ...options });
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  }

  async downloadToFile(url: string, path: string, options: DownloadFileOptions = {}): Promise<DownloadedFile> {
    const temp = join(dirname(path), "." + basename(path) + "." + randomUUID() + ".part");
    try {
      // wx prevents touching existing temporary paths; temp lives beside target for atomic promotion.
      const handle = await open(temp, "wx");
      const writable = Writable.toWeb(handle.createWriteStream()) as WritableStream<Uint8Array>;
      const receipt = await this.downloadToStream(url, writable, options);
      if (options.overwrite) await rename(temp, path);
      else { await link(temp, path); await rm(temp); } // atomic no-clobber
      return { path, url, name: basename(path), ...receipt };
    } finally {
      await rm(temp, { force: true }).catch(() => {});
    }
  }

  async downloadSeparationOutputs(
    result: SeparationResult,
    destination: string,
    options: OutputDownloadOptions = {},
  ): Promise<OutputManifest> {
    const output = getOutputFiles(result);
    const files: DownloadedFile[] = [];
    const errors: OutputManifest["errors"] = [];
    const used = new Set<string>();
    for (const [i, file] of output.entries()) {
      const rawName = safeOutputFilename(file.name);
      const extension = extname(rawName);
      const stem = rawName.slice(0, rawName.length - extension.length);
      let name = rawName;
      let suffix = 2;
      while (used.has(name.toLowerCase())) name = stem + "-" + suffix++ + extension;
      used.add(name.toLowerCase());
      try {
        files.push(await this.downloadToFile(file.url, join(destination, name), {
          ...options, onProgress: progress => {
            options.onProgress?.(progress);
            options.onFileProgress?.(file, progress, i, output.length);
          },
        }));
      } catch (error) {
        errors.push({ name, message: error instanceof Error ? error.message : "Unknown download failure" });
      }
    }
    return { ...(typeof result.data?.hash === "string" ? { hash: result.data.hash } : {}), files, errors };
  }
}
