export type MvsepRegion = "apex" | "de" | "de2" | "sg" | (string & {});

export type SeparationStatus =
  | "not_found"
  | "waiting"
  | "processing"
  | "done"
  | "failed"
  | "distributing"
  | "merging"
  | (string & {});

export type RemoteType = "direct" | "mega" | "drive" | "dropbox";
export type AlgorithmScope = "single_upload" | "no_upload" | "matchering_upload";
export type OutputFormat = 0 | 1 | 2 | 3 | 4 | 5;

export interface ApiEnvelope<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: unknown;
}

export interface CreateSeparationData {
  link?: string;
  hash?: string;
  message?: string;
  [key: string]: unknown;
}

export interface CreateSeparationResponse extends ApiEnvelope<CreateSeparationData> {}

export interface SeparationFile {
  name?: string;
  url?: string;
  link?: string;
  path?: string;
  size?: number | string;
  [key: string]: unknown;
}

export interface SeparationResultData {
  type?: string;
  queue_count?: number;
  current_order?: number;
  message?: string;
  algorithm?: unknown;
  algorithm_description?: unknown;
  output_format?: unknown;
  tags?: unknown;
  input_file?: unknown;
  files?: SeparationFile[];
  date?: string;
  finished_chunks?: number;
  all_chunks?: number;
  link?: string;
  hash?: string;
  [key: string]: unknown;
}

export interface SeparationResult {
  success: boolean;
  status: SeparationStatus;
  data?: SeparationResultData;
  [key: string]: unknown;
}

export interface BinaryPart {
  data: Blob | ArrayBuffer | Uint8Array;
  filename?: string;
  contentType?: string;
}

export interface CreateSeparationInput {
  audiofile?: BinaryPart;
  targetAudiofile?: BinaryPart;
  referenceAudiofile?: BinaryPart;
  url?: string;
  remoteType?: RemoteType;
  sepType?: number;
  presetId?: number;
  addOpt1?: string | number;
  addOpt2?: string | number;
  addOpt3?: string | number;
  additionalOptions?: Record<string, string | number | boolean>;
  outputFormat?: OutputFormat;
  isDemo?: boolean;
  webhookUrl?: string;
}

export interface RequestContext {
  method: string;
  path: string;
  attempt: number;
  maxAttempts: number;
  keyIndex?: number;
}

export type MvsepProgressEvent =
  | ({ type: "request"; phase: "start" | "success" } & RequestContext & { status?: number })
  | ({ type: "rate_limit"; waitMs: number } & RequestContext)
  | ({ type: "retry"; delayMs: number; reason: string; status?: number } & RequestContext)
  | ({ type: "key_rotation"; from?: number; to: number; reason: string } & Omit<RequestContext, "keyIndex">)
  | {
      type: "poll";
      hash: string;
      pollCount: number;
      elapsedMs: number;
      status: SeparationStatus;
      queueCount?: number;
      currentOrder?: number;
      finishedChunks?: number;
      allChunks?: number;
      fraction?: number;
      result: SeparationResult;
    };

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: "none" | "full" | "equal";
  retryableStatusCodes?: readonly number[];
  /**
   * Retrying a create request after a transport failure can create duplicate jobs because
   * MVSep does not document an idempotency key. `safe` only retries responses that
   * explicitly indicate the request was rejected before normal processing (currently 429).
   */
  unsafeCreateRetries?: "never" | "safe" | "aggressive";
}

export interface RateLimitOptions {
  /** Average request rate across all calls. Set to 0 or Infinity to disable. */
  requestsPerSecond?: number;
  /** Token bucket burst capacity. */
  burst?: number;
  /** Maximum in-flight HTTP requests. */
  maxConcurrency?: number;
}

export interface KeyRotationOptions {
  strategy?: "round_robin" | "sticky";
  rateLimitCooldownMs?: number;
  transientFailureCooldownMs?: number;
  disableKeyOnUnauthorized?: boolean;
}

export interface MvsepClientOptions {
  apiKeys?: string | readonly string[];
  /** `https://mvsep.com/api` by default. */
  baseUrl?: string;
  region?: MvsepRegion;
  fetch?: typeof globalThis.fetch;
  requestTimeoutMs?: number;
  retry?: RetryOptions;
  rateLimit?: RateLimitOptions;
  keyRotation?: KeyRotationOptions;
  /** Maximum in-memory job/key affinity entries, evicting the oldest. */
  maxJobAffinities?: number;
  onProgress?: ((event: MvsepProgressEvent) => void) | undefined;
}


export interface CallOptions {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  onProgress?: ((event: MvsepProgressEvent) => void) | undefined;
}

export interface RequestOptions {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  authenticated?: boolean | undefined;
  idempotent?: boolean | undefined;
  operation?: "create" | "generic" | undefined;
  onProgress?: ((event: MvsepProgressEvent) => void) | undefined;
}

export interface GetSeparationOptions {
  mirror?: boolean | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  onProgress?: ((event: MvsepProgressEvent) => void) | undefined;
}

export interface PollOptions extends GetSeparationOptions {
  intervalMs?: number | undefined;
  maxIntervalMs?: number | undefined;
  backoffFactor?: number | undefined;
  maxWaitMs?: number | undefined;
  throwOnFailed?: boolean | undefined;
}

export interface CreateAndWaitOptions extends PollOptions {
  createSignal?: AbortSignal | undefined;
}

export interface AlgorithmFieldOption {
  key?: string | number;
  value?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AlgorithmField {
  default_key?: string | number;
  text?: string;
  name?: string;
  label?: string;
  type?: string;
  /** Upstream may return a JSON-encoded option map, an object or an array. */
  options?: string | AlgorithmFieldOption[] | Record<string, unknown>;
  [key: string]: unknown;
}

export interface SeparationAlgorithm {
  render_id: number;
  name: string;
  algorithm_group_id?: number;
  algorithm_group?: { name?: string; [key: string]: unknown };
  audio_widget?: AlgorithmScope | string;
  orientation?: number;
  order_id?: number;
  price_coefficient?: number;
  usage?: number;
  rating?: { average?: number; total?: number; [key: string]: unknown };
  algorithm_fields?: AlgorithmField[];
  algorithm_descriptions?: unknown;
  [key: string]: unknown;
}

export interface DownloadProgress {
  loaded: number;
  total?: number;
  fraction?: number;
}

export interface RawRequestInput {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  form?: Record<string, string | number | boolean | BinaryPart | undefined>;
  headers?: HeadersInit | undefined;
  authenticated?: boolean | undefined;
  idempotent?: boolean | undefined;
  operation?: "create" | "generic" | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  onProgress?: ((event: MvsepProgressEvent) => void) | undefined;
}

export interface DownloadOptions {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  onProgress?: (progress: DownloadProgress) => void;
}
