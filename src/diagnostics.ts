import type { MvsepProgressEvent } from "./types.js";

export interface MvsepDiagnostic {
  at: string;
  type: MvsepProgressEvent["type"];
  path?: string;
  phase?: string;
  attempt?: number;
  elapsedMs?: number;
  waitMs?: number;
  status?: string | number;
  /** No URLs, API keys, filenames or request bodies are retained. */
  [key: string]: unknown;
}

export class MvsepDiagnostics {
  private readonly records: MvsepDiagnostic[] = [];
  private readonly listeners = new Set<(record: MvsepDiagnostic) => void>();
  private readonly started = new Map<string, number>();

  constructor(private readonly capacity = 1000) {
    if (!Number.isSafeInteger(capacity) || capacity < 1)
      throw new RangeError("Diagnostics capacity must be a positive integer");
  }

  /** Pass this.onProgress to the client and/or individual calls. */
  onProgress = (event: MvsepProgressEvent): void => {
    const at = new Date().toISOString();
    const record: MvsepDiagnostic = { at, type: event.type };
    if ("path" in event && typeof event.path === "string") record.path = event.path;
    if ("attempt" in event && typeof event.attempt === "number") record.attempt = event.attempt;
    if ("phase" in event && typeof event.phase === "string") record.phase = event.phase;
    if ("status" in event) record.status = event.status;
    if ("elapsedMs" in event) record.elapsedMs = event.elapsedMs;
    if ("waitMs" in event) record.waitMs = event.waitMs;
    if (event.type === "request") {
      const key = event.path + ":" + event.attempt;
      if (event.phase === "start") this.started.set(key, Date.now());
      else {
        const start = this.started.get(key);
        if (start !== undefined) record.durationMs = Date.now() - start;
        this.started.delete(key);
      }
    }
    this.records.push(record);
    if (this.records.length > this.capacity) this.records.shift();
    for (const listener of this.listeners) {
      try { listener(record); } catch { /* observer isolation */ }
    }
  };

  subscribe(listener: (record: MvsepDiagnostic) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  snapshot(): readonly MvsepDiagnostic[] { return [...this.records]; }
  clear(): void { this.records.length = 0; this.started.clear(); }
}
