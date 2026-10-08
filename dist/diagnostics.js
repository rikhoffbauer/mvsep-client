export class MvsepDiagnostics {
    capacity;
    records = [];
    listeners = new Set();
    started = new Map();
    constructor(capacity = 1000) {
        this.capacity = capacity;
        if (!Number.isSafeInteger(capacity) || capacity < 1)
            throw new RangeError("Diagnostics capacity must be a positive integer");
    }
    /** Pass this.onProgress to the client and/or individual calls. */
    onProgress = (event) => {
        const at = new Date().toISOString();
        const record = { at, type: event.type };
        if ("path" in event && typeof event.path === "string")
            record.path = event.path;
        if ("attempt" in event && typeof event.attempt === "number")
            record.attempt = event.attempt;
        if ("phase" in event && typeof event.phase === "string")
            record.phase = event.phase;
        if ("status" in event)
            record.status = event.status;
        if ("elapsedMs" in event)
            record.elapsedMs = event.elapsedMs;
        if ("waitMs" in event)
            record.waitMs = event.waitMs;
        if (event.type === "request") {
            const key = event.path + ":" + event.attempt;
            if (event.phase === "start")
                this.started.set(key, Date.now());
            else {
                const start = this.started.get(key);
                if (start !== undefined)
                    record.durationMs = Date.now() - start;
                this.started.delete(key);
            }
        }
        this.records.push(record);
        if (this.records.length > this.capacity)
            this.records.shift();
        for (const listener of this.listeners) {
            try {
                listener(record);
            }
            catch { /* observer isolation */ }
        }
    };
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    snapshot() { return [...this.records]; }
    clear() { this.records.length = 0; this.started.clear(); }
}
//# sourceMappingURL=diagnostics.js.map