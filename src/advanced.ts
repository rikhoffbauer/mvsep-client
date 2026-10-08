import { openAsBlob } from "node:fs";
import { basename } from "node:path";
import {
  MvsepAbortError, MvsepApiError, MvsepAuthenticationError, MvsepJobFailedError, MvsepTimeoutError,
} from "./errors.js";
import { MvsepClient as BaseClient } from "./client.js";
import {
  estimateJobCredits as estimateCost, prepareSeparation as prepareInput,
  validateSeparation as validateInput, getOutputFiles, reconcileWebhook,
} from "./metadata.js";
import type { CallOptions, CreateSeparationInput, MvsepClientOptions, SeparationAlgorithm, SeparationResult } from "./types.js";
import type {
  BatchInput, BatchOptions, BatchResult, CreateJobOptions, DemoQuery, GuardedCreateOptions, HistoryQuery,
  JobCostEstimate, JobHandleStore, JobWatchEvent, JobWatchOptions, LeaderboardQuery, MetadataCache,
  MvsepCreditAlert, MvsepDemoEntry, MvsepHistoryEntry, MvsepJobHandle, MvsepLeaderboard,
  MvsepPurchase, MvsepPurchases, MvsepQueue, MvsepQueueSummary, MvsepQualityEntry, MvsepUser,
  NewsEntry, OutputManifest, OutputDownloadOptions, Pagination, PrepareSeparationOptions,
  PreparedSeparation, PurchaseQuery, ValidateOptions,
} from "./extended-types.js";

export interface AdvancedClientOptions extends MvsepClientOptions {
  /** Stable, non-secret account identifiers in apiKeys order. Required for safe multi-key recovery. */
  keyIdentifiers?: readonly string[];
  algorithmsCache?: MetadataCache;
  algorithmsCacheTtlMs?: number;
}

function pagination(value: number | undefined, fallback: number, max: number, name: string): number {
  const number = value ?? fallback;
  if (!Number.isSafeInteger(number) || number < (name === "limit" ? 1 : 0) || number > max)
    throw new RangeError(name + " must be an integer between " + (name === "limit" ? 1 : 0) + " and " + max);
  return number;
}
function unwrap<T>(payload: unknown, label: string): T {
  if (!payload || typeof payload !== "object")
    throw new MvsepApiError("Invalid MVSep " + label + " response", { response: payload });
  const record = payload as Record<string, unknown>;
  if (record.success === false)
    throw new MvsepApiError("MVSep " + label + " was rejected", { response: payload });
  if (record.success === true && Object.hasOwn(record, "data")) return record.data as T;
  return payload as T;
}
function asArray<T>(data: unknown, label: string): T[] {
  const parsed = unwrap<unknown>(data, label);
  if (!Array.isArray(parsed))
    throw new MvsepApiError("Expected array from MVSep " + label, { response: data });
  return parsed as T[];
}
function enumNumber(name: string, value: number, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError("Invalid " + name);
}

/** Lazily opened, disk-backed Blob on Node 20+ and Bun. */
export async function fileBlobFromPath(path: string, contentType?: string) {
  const blob = await openAsBlob(path, contentType ? { type: contentType } : undefined);
  return { data: blob, filename: basename(path), ...(contentType ? { contentType } : {}) };
}

/** Full featured client. The transport-only class is also available as MvsepCoreClient. */
export class MvsepClient extends BaseClient {
  private readonly identifiers: readonly string[];
  private readonly cache: MetadataCache | undefined;
  private readonly cacheTtlMs: number;

  constructor(options: AdvancedClientOptions = {}) {
    super(options);
    this.identifiers = options.keyIdentifiers ?? [];
    if (this.identifiers.length && (this.identifiers.length !== this.apiKeyState.length ||
      new Set(this.identifiers).size !== this.identifiers.length || this.identifiers.some(value => !value.trim()))) {
      throw new TypeError("keyIdentifiers must have one unique nonempty ID for each configured API key");
    }
    this.cache = options.algorithmsCache;
    this.cacheTtlMs = options.algorithmsCacheTtlMs ?? 300_000;
    if (!Number.isFinite(this.cacheTtlMs) || this.cacheTtlMs < 0)
      throw new RangeError("Invalid algorithmsCacheTtlMs");
  }

  override async getAlgorithms(
    scopes?: import("./types.js").AlgorithmScope | readonly import("./types.js").AlgorithmScope[],
    options: CallOptions & { refresh?: boolean } = {},
  ): Promise<SeparationAlgorithm[]> {
    if (!this.cache) return super.getAlgorithms(scopes, options);
    const key = (typeof scopes === "string" ? scopes : scopes?.join(",")) ?? "single_upload";
    if (!options.refresh) {
      const cached = await this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.algorithms;
    }
    const algorithms = await super.getAlgorithms(scopes, options);
    await this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, algorithms });
    return algorithms;
  }
  async invalidateAlgorithms(scopes = "single_upload"): Promise<void> {
    await this.cache?.delete(scopes);
  }

  async getAlgorithm(renderId: number, options: CallOptions = {}): Promise<SeparationAlgorithm> {
    enumNumber("renderId", renderId, 0);
    const list = await this.getAlgorithms(["single_upload", "no_upload", "matchering_upload"], options);
    const model = list.find(value => value.render_id === renderId);
    if (!model) throw new MvsepApiError("Unknown MVSep algorithm " + renderId);
    return model;
  }
  prepareSeparation(options: PrepareSeparationOptions): PreparedSeparation {
    return prepareInput(options);
  }
  validateSeparation(input: CreateSeparationInput, algorithm: SeparationAlgorithm, options: ValidateOptions = {}): void {
    validateInput(input, algorithm, options);
  }
  async estimateJobCredits(options: { algorithm: number | SeparationAlgorithm; durationSeconds?: number }): Promise<JobCostEstimate> {
    const algorithm = typeof options.algorithm === "number" ? await this.getAlgorithm(options.algorithm) : options.algorithm;
    return estimateCost(algorithm, options.durationSeconds);
  }
  async createGuardedSeparation(input: CreateSeparationInput, options: GuardedCreateOptions) {
    if (input.presetId !== undefined || input.sepType === undefined)
      throw new MvsepApiError("Guarded create requires a single recognized algorithm, not a preset");
    if (!Number.isFinite(options.maxEstimatedCredits) || options.maxEstimatedCredits < 0)
      throw new RangeError("maxEstimatedCredits must be finite and nonnegative");
    const estimate = await this.estimateJobCredits({ algorithm: input.sepType, durationSeconds: options.durationSeconds });
    if (estimate.estimatedCredits === null)
      throw new MvsepApiError("Cannot verify MVSep credit estimate; submission refused");
    if (estimate.estimatedCredits > options.maxEstimatedCredits)
      throw new MvsepApiError("Estimated credits exceed maximum; submission refused");
    if (options.checkAccountBalance) {
      const user = await this.getUser({ signal: options.signal, timeoutMs: options.timeoutMs });
      if (user.premium_enabled !== 1 && user.premium_enabled !== true)
        throw new MvsepApiError("Premium usage is not enabled for this account");
      if (typeof user.premium_minutes !== "number" || user.premium_minutes < estimate.estimatedCredits)
        throw new MvsepApiError("MVSep credit balance is insufficient or unknown");
    }
    return this.createSeparation(input, options);
  }

  async getUser(options: CallOptions & { includeApiToken?: boolean } = {}): Promise<MvsepUser> {
    const response = await this.request<unknown>({ path: "/app/user", authenticated: true, ...options });
    const user = unwrap<MvsepUser>(response, "user");
    if (!user || typeof user !== "object" || Array.isArray(user))
      throw new MvsepApiError("Invalid user profile", { response });
    if (options.includeApiToken) return user;
    const { api_token: _omit, ...safe } = user;
    return safe;
  }
  async getQueue(options: CallOptions = {}): Promise<MvsepQueue> {
    return unwrap<MvsepQueue>(await this.request({
      path: "/app/queue", authenticated: this.apiKeyState.length > 0, ...options,
    }), "queue");
  }
  async getQueueSummary(options: CallOptions = {}): Promise<MvsepQueueSummary> {
    const data = unwrap<MvsepQueueSummary>(await this.request({
      path: "/app/queue/summary", authenticated: true, ...options,
    }), "queue summary");
    if (!data || typeof data.queued !== "number" || typeof data.processing !== "number" ||
        typeof data.ahead !== "number" ||
        !(data.estimated_wait_seconds === null || typeof data.estimated_wait_seconds === "number"))
      throw new MvsepApiError("Invalid queue summary response", { response: data });
    return data;
  }
  async getSeparationHistory(query: HistoryQuery = {}, options: CallOptions = {}): Promise<MvsepHistoryEntry[]> {
    return asArray<MvsepHistoryEntry>(await this.request({
      path: "/app/separation_history", authenticated: true,
      query: { start: pagination(query.start, 0, Number.MAX_SAFE_INTEGER, "start"), limit: pagination(query.limit, 10, 20, "limit") },
      ...options,
    }), "history");
  }
  async getPurchases(query: PurchaseQuery = {}, options: CallOptions = {}): Promise<MvsepPurchases> {
    const response = await this.request<MvsepPurchases>({
      path: "/purchases", authenticated: true,
      query: { status: query.status, offset: pagination(query.offset, 0, Number.MAX_SAFE_INTEGER, "offset"),
        limit: pagination(query.limit, 20, 100, "limit") },
      ...options,
    });
    if (!response || !Array.isArray(response.purchases)) throw new MvsepApiError("Invalid purchases response", { response });
    return response;
  }
  async getCreditAlert(options: CallOptions = {}): Promise<MvsepCreditAlert> {
    return unwrap<MvsepCreditAlert>(await this.request({
      path: "/credit_alert", authenticated: true, ...options,
    }), "credit alert");
  }
  async setCreditAlert(threshold: number, options: CallOptions = {}): Promise<MvsepCreditAlert> {
    enumNumber("credit threshold", threshold, 0);
    return unwrap<MvsepCreditAlert>(await this.request({
      path: "/credit_alert", method: "POST", authenticated: true, idempotent: false,
      form: { credit_threshold: threshold }, ...options,
    }), "credit alert");
  }
  async setPremiumUsageEnabled(enabled: boolean, options: CallOptions = {}): Promise<void> {
    const payload = await this.request<unknown>({
      path: enabled ? "/app/enable_premium" : "/app/disable_premium",
      method: "POST", authenticated: true, idempotent: false, ...options,
    });
    unwrap(payload, "premium preference");
  }
  async setLongFilenamesEnabled(enabled: boolean, options: CallOptions = {}): Promise<void> {
    const payload = await this.request<unknown>({
      path: enabled ? "/app/enable_long_filenames" : "/app/disable_long_filenames",
      method: "POST", authenticated: true, idempotent: false, ...options,
    });
    unwrap(payload, "long filename preference");
  }
  async getNews(query: Pagination & { lang?: string } = {}, options: CallOptions = {}): Promise<NewsEntry[]> {
    return asArray<NewsEntry>(await this.request({
      path: "/app/news", query: {
        start: pagination(query.start, 0, Number.MAX_SAFE_INTEGER, "start"),
        limit: pagination(query.limit, 10, 20, "limit"), lang: query.lang,
      }, ...options,
    }), "news");
  }
  async getDemoSeparations(query: DemoQuery = {}, options: CallOptions = {}): Promise<MvsepDemoEntry[]> {
    const params: Record<string, string | number> = {
      start: pagination(query.start, 0, Number.MAX_SAFE_INTEGER, "start"),
      limit: pagination(query.limit, 10, 20, "limit"),
    };
    if (query.algorithmId !== undefined) { enumNumber("algorithmId", query.algorithmId, 0); params.algorithm_id = query.algorithmId; }
    if (query.additionalOptions) params.additional_options = query.additionalOptions;
    for (const [name, value] of Object.entries(query.options ?? {})) {
      if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new TypeError("Invalid demo option name");
      params["options[" + name + "]"] = value;
    }
    return asArray<MvsepDemoEntry>(await this.request({ path: "/app/demo", query: params, ...options }), "demo");
  }
  async getQualityLeaderboard(query: LeaderboardQuery = {}, options: CallOptions = {}): Promise<MvsepLeaderboard> {
    const response = await this.request<MvsepLeaderboard>({
      path: "/quality_checker/leaderboard", query: {
        dataset_type: query.datasetType, sort: query.sort, algo_name_filter: query.algorithmNameFilter,
        start: pagination(query.start, 0, Number.MAX_SAFE_INTEGER, "start"),
        limit: pagination(query.limit, 10, 20, "limit"),
      }, ...options,
    });
    if (!response || !Array.isArray(response.data)) throw new MvsepApiError("Invalid leaderboard response", { response });
    return response;
  }
  async getQualityQueue(query: Pagination = {}, options: CallOptions = {}): Promise<MvsepQualityEntry[]> {
    return asArray<MvsepQualityEntry>(await this.request({
      path: "/quality_checker/queue",
      query: { start: pagination(query.start, 0, Number.MAX_SAFE_INTEGER, "start"),
        limit: pagination(query.limit, 10, 20, "limit") },
      ...options,
    }), "quality queue");
  }
  async getQualityEntry(id: number, options: CallOptions = {}): Promise<MvsepQualityEntry> {
    enumNumber("quality entry ID", id, 0);
    return unwrap<MvsepQualityEntry>(await this.request({
      path: "/quality_checker/entry", query: { id }, ...options,
    }), "quality entry");
  }

  async createSeparationFromFile(
    path: string,
    input: Omit<CreateSeparationInput, "audiofile" | "url"> = {},
    options: CallOptions = {},
  ) {
    return this.createSeparation({ ...input, audiofile: await fileBlobFromPath(path) }, options);
  }

  async createJob(input: CreateSeparationInput, options: CreateJobOptions = {}): Promise<MvsepJobHandle> {
    const response = await this.createSeparation(input, options);
    const hash = response.data?.hash;
    if (!hash) throw new MvsepApiError("Create did not return a hash");
    const index = this.getJobApiKeyIndex(hash);
    const keyId = index === undefined ? undefined : this.identifiers[index];
    return {
      version: 1, hash, baseUrl: this.baseUrl, createdAt: new Date().toISOString(),
      ...(keyId ? { keyId } : {}), ...(input.sepType !== undefined ? { algorithmId: input.sepType } : {}),
      ...(input.presetId !== undefined ? { presetId: input.presetId } : {}),
      ...(options.inputId !== undefined ? { inputId: options.inputId } : {}),
    };
  }
  resumeJob(handle: MvsepJobHandle): string {
    if (handle.version !== 1 || !handle.hash || handle.baseUrl !== this.baseUrl)
      throw new MvsepApiError("Job handle is invalid or belongs to a different API endpoint");
    if (handle.keyId) {
      const index = this.identifiers.indexOf(handle.keyId);
      if (index < 0) throw new MvsepAuthenticationError("Required account identifier is missing");
      this.bindJobToApiKey(handle.hash, index);
    } else if (this.apiKeyState.length > 1 && this.getJobApiKeyIndex(handle.hash) === undefined) {
      throw new MvsepAuthenticationError("Cannot recover multi-key job without a stable key identifier");
    } else if (this.apiKeyState.length === 1) this.bindJobToApiKey(handle.hash, 0);
    return handle.hash;
  }
  async waitForJob(handle: MvsepJobHandle, options: import("./types.js").PollOptions = {}): Promise<SeparationResult> {
    return this.waitForSeparation(this.resumeJob(handle), options);
  }
  async restoreJobHandles(store: JobHandleStore): Promise<MvsepJobHandle[]> {
    const handles = await store.load();
    for (const handle of handles) this.resumeJob(handle);
    return handles;
  }
  async saveJobHandles(store: JobHandleStore, handles: readonly MvsepJobHandle[]): Promise<void> {
    for (const handle of handles) this.resumeJob(handle);
    await store.save(handles);
  }

  /** Watch job state, with optional separately throttled account queue reports. */
  async *watchJob(hash: string, options: JobWatchOptions = {}): AsyncGenerator<JobWatchEvent> {
    const started = Date.now();
    const maxWaitMs = options.maxWaitMs ?? 30 * 60_000;
    const interval = options.intervalMs ?? 2_000;
    const queueInterval = options.queueIntervalMs ?? 10_000;
    if (!(maxWaitMs === Infinity || (Number.isFinite(maxWaitMs) && maxWaitMs >= 0)) ||
        !Number.isFinite(interval) || interval < 0 ||
        !Number.isFinite(queueInterval) || queueInterval < 0)
      throw new RangeError("Invalid watch intervals");
    let nextQueue = 0;
    while (true) {
      if (options.signal?.aborted) throw new MvsepAbortError("Job watch aborted", { cause: options.signal.reason });
      const remaining = maxWaitMs - (Date.now() - started);
      if (remaining <= 0) throw new MvsepTimeoutError("Job watch exceeded deadline");
      const result = await this.getSeparation(hash, {
        ...options, timeoutMs: Math.min(remaining, options.timeoutMs ?? 60_000),
      });
      yield { type: "status", result, elapsedMs: Date.now() - started };
      if (["done", "failed", "not_found"].includes(result.status)) {
        if (options.throwOnFailed !== false && result.status !== "done") throw new MvsepJobFailedError(result);
        yield { type: "complete", result };
        return;
      }
      if (options.includeQueue && Date.now() >= nextQueue) {
        yield { type: "queue", summary: await this.getQueueSummary(options) };
        nextQueue = Date.now() + queueInterval;
      }
      await new Promise<void>((resolve, reject) => {
        if (options.signal?.aborted) return reject(new MvsepAbortError("Job watch aborted", { cause: options.signal.reason }));
        const abort = () => { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); reject(new MvsepAbortError("Job watch aborted", { cause: options.signal?.reason })); };
        const timer = setTimeout(() => { options.signal?.removeEventListener("abort", abort); resolve(); },
          Math.min(interval, maxWaitMs - (Date.now() - started)));
        options.signal?.addEventListener("abort", abort, { once: true });
      });
    }
  }
}
