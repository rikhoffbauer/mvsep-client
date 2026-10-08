import type {
  CallOptions, CreateSeparationInput, DownloadProgress, PollOptions, SeparationAlgorithm,
  SeparationFile, SeparationResult,
} from "./types.js";

/** Profile data returned by GET /app/user. API token is omitted by default. */
export interface MvsepUser {
  name?: string;
  email?: string;
  premium_minutes?: number;
  premium_enabled?: 0 | 1 | boolean;
  long_filenames_enabled?: 0 | 1 | boolean;
  current_queue?: unknown;
  [key: string]: unknown;
}
export interface MvsepQueue {
  queue: { in_process?: number; premium?: number; registered?: number; unregistered?: number; [key: string]: unknown };
  plan?: { plan?: string; queue?: number; [key: string]: unknown };
  [key: string]: unknown;
}
export interface MvsepQueueSummary {
  queued: number;
  processing: number;
  ahead: number;
  estimated_wait_seconds: number | null;
  throughput_per_min?: number | null;
  [key: string]: unknown;
}
export interface MvsepHistoryEntry {
  hash: string;
  job_exists?: boolean;
  credits?: number | null;
  time_left?: number | null;
  algorithm?: SeparationAlgorithm | unknown;
  [key: string]: unknown;
}
export interface MvsepPurchase {
  payment_id?: string;
  status?: string;
  amount?: number | string;
  credits?: number;
  payment_method?: string;
  date?: string;
  [key: string]: unknown;
}
export interface MvsepPurchases {
  purchases: MvsepPurchase[];
  total: number;
  credits: number;
  [key: string]: unknown;
}
export interface MvsepCreditAlert {
  credit_threshold: number;
  enabled: boolean;
  credits?: number;
  notified?: boolean;
  email?: string;
  [key: string]: unknown;
}
export interface MvsepDemoEntry {
  hash: string;
  date?: string;
  input_audio?: string;
  size?: number | string;
  algorithm?: SeparationAlgorithm;
  [key: string]: unknown;
}
export interface MvsepQualityEntry {
  id: number;
  dataset_type?: number | string;
  algo_name?: string;
  main_text?: string;
  metrics?: Record<string, number | string | null>;
  [key: string]: unknown;
}
export interface MvsepLeaderboard {
  data: MvsepQualityEntry[];
  dataset_type?: number | string;
  sortables?: string[] | Record<string, string>;
  sort?: string;
  [key: string]: unknown;
}
export interface Pagination { start?: number; limit?: number }
export interface HistoryQuery extends Pagination {}
export interface PurchaseQuery { status?: string; offset?: number; limit?: number }
export interface DemoQuery extends Pagination {
  algorithmId?: number;
  options?: Record<string, string | number>;
  additionalOptions?: string;
}
export interface LeaderboardQuery extends Pagination {
  datasetType?: number | string;
  sort?: string;
  algorithmNameFilter?: string;
}
export interface NewsEntry { title?: string; lang?: string; text?: string; created_at?: string; [key: string]: unknown }

/** Estimate only. Null means that pricing is unknown, never zero. */
export interface JobCostEstimate {
  algorithmId: number;
  durationSeconds: number | null;
  coefficient: number | null;
  estimatedCredits: number | null;
  isEstimate: true;
  reason?: string;
}
export interface GuardedCreateOptions extends CallOptions {
  /** Refuse submission if pricing is unknown or estimate exceeds this cap. */
  maxEstimatedCredits: number;
  durationSeconds: number;
  /** Re-read the account's credits and enabled flag immediately before submission. */
  checkAccountBalance?: boolean;
}
export interface ValidateOptions {
  strict?: boolean;
  /** When supplied, reject metadata marked registered-only for guests. */
  registered?: boolean;
  /** When supplied, reject metadata marked Premium-only for non-Premium users. */
  premium?: boolean;
}
export interface PreparedSeparation {
  input: CreateSeparationInput;
  algorithm: SeparationAlgorithm;
}
export interface PrepareSeparationOptions {
  algorithm: SeparationAlgorithm;
  input: Omit<CreateSeparationInput, "sepType" | "presetId" | "addOpt1" | "addOpt2" | "addOpt3">;
  /** Keys must be actual add_opt1/add_opt2/add_opt3 metadata names; values must match options keys. */
  fields?: Record<string, string | number>;
  strict?: boolean;
}

/** Credential-free durable job reference; supply stable key IDs when configuring a client. */
export interface MvsepJobHandle {
  version: 1;
  /** Empty only for a batch pre-submission checkpoint, never for an accepted job. */
  hash: string;
  submissionState?: "pending";
  baseUrl: string;
  keyId?: string;
  algorithmId?: number;
  presetId?: number;
  inputId?: string;
  createdAt: string;
}
export interface JobHandleStore {
  load(): Promise<MvsepJobHandle[]>;
  save(handles: readonly MvsepJobHandle[]): Promise<void>;
}
export interface CreateJobOptions extends CallOptions { inputId?: string }

export interface StreamDownloadOptions extends Omit<CallOptions, "onProgress"> {
  onProgress?: (progress: DownloadProgress) => void;
  maxBytes?: number;
  /** Maximum retry count before any bytes are written (default inherits retry config). */
  maxAttempts?: number;
}
export interface DownloadFileOptions extends StreamDownloadOptions {
  /** Existing target is never replaced unless explicitly enabled. */
  overwrite?: boolean;
}
export interface DownloadReceipt { loaded: number; total?: number }
export interface DownloadedFile extends DownloadReceipt { path: string; url: string; name: string }
export interface NormalizedOutput {
  name: string;
  url: string;
  size?: number;
  raw: SeparationFile;
}
export interface OutputDownloadOptions extends DownloadFileOptions {
  onFileProgress?: (file: NormalizedOutput, progress: DownloadProgress, fileIndex: number, fileCount: number) => void;
}
export interface OutputManifest {
  hash?: string;
  files: DownloadedFile[];
  errors: Array<{ name: string; message: string }>;
}
export interface JobWatchOptions extends PollOptions {
  includeQueue?: boolean;
  queueIntervalMs?: number;
}
export type JobWatchEvent =
  | { type: "status"; result: SeparationResult; elapsedMs: number }
  | { type: "queue"; summary: MvsepQueueSummary }
  | { type: "complete"; result: SeparationResult };
export interface MetadataCache {
  get(key: string): Promise<{ expiresAt: number; algorithms: SeparationAlgorithm[] } | null>;
  set(key: string, value: { expiresAt: number; algorithms: SeparationAlgorithm[] }): Promise<void>;
  delete(key: string): Promise<void>;
}
export interface BatchInput {
  input: CreateSeparationInput;
  durationSeconds?: number;
  id?: string;
}
export interface BatchOptions extends PollOptions {
  /** Server-side active jobs, not HTTP request slots. Defaults to 1. */
  maxActiveJobs?: number;
  maxEstimatedCredits?: number;
  onJobEvent?: (index: number, type: "queued" | "submitted" | "complete" | "failed", value?: unknown) => void;
  checkpointStore?: JobHandleStore;
  /** Optional pause/resume/stop controller for new submissions. */
  runner?: import("./batch.js").BatchRunner;
}
export interface BatchResult {
  index: number;
  id?: string;
  handle?: MvsepJobHandle;
  result?: SeparationResult;
  error?: string;
}
