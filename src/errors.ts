import type { SeparationResult } from "./types.js";

export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) {
      if (/token|key|secret|signature|auth|password|credential/i.test(key))
        url.searchParams.set(key, "[REDACTED]");
    }
    return url.toString();
  } catch {
    return redactText(value);
  }
}
export function redactText(value: string): string {
  return value.replace(/(api_token|api_key|access_token|signature|sig)=([^\s&#]+)/gi, "$1=[REDACTED]");
}
function sanitizeResponse(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(sanitizeResponse);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) =>
      [key, /token|secret|password|authorization/i.test(key) ? "[REDACTED]" : sanitizeResponse(child)]));
  }
  return value;
}


export interface MvsepErrorOptions {
  cause?: unknown;
  status?: number;
  response?: unknown;
  method?: string;
  url?: string;
  retryable?: boolean;
  apiKeyIndex?: number;
}

export class MvsepError extends Error {
  readonly status: number | undefined;
  readonly response: unknown;
  readonly method: string | undefined;
  readonly url: string | undefined;
  readonly retryable: boolean;
  readonly apiKeyIndex: number | undefined;

  constructor(message: string, options: MvsepErrorOptions = {}) {
    const safeCause = options.cause === undefined ? undefined :
      options.cause instanceof Error ? new Error(redactText(options.cause.message)) :
      sanitizeResponse(options.cause);
    super(redactText(message), safeCause === undefined ? undefined : { cause: safeCause });
    this.name = "MvsepError";
    this.status = options.status;
    this.response = sanitizeResponse(options.response);
    this.method = options.method;
    this.url = options.url === undefined ? undefined : redactUrl(options.url);
    this.retryable = options.retryable ?? false;
    this.apiKeyIndex = options.apiKeyIndex;
  }
}

export class MvsepHttpError extends MvsepError {
  constructor(message: string, options: MvsepErrorOptions = {}) {
    super(message, options);
    this.name = "MvsepHttpError";
  }
}

export class MvsepApiError extends MvsepError {
  constructor(message: string, options: MvsepErrorOptions = {}) {
    super(message, options);
    this.name = "MvsepApiError";
  }
}

export class MvsepAuthenticationError extends MvsepApiError {
  constructor(message: string, options: MvsepErrorOptions = {}) {
    super(message, options);
    this.name = "MvsepAuthenticationError";
  }
}

export class MvsepRateLimitError extends MvsepHttpError {
  readonly retryAfterMs: number | undefined;

  constructor(message: string, options: MvsepErrorOptions & { retryAfterMs?: number } = {}) {
    super(message, options);
    this.name = "MvsepRateLimitError";
    this.retryAfterMs = options.retryAfterMs;
  }
}

export class MvsepTimeoutError extends MvsepError {
  constructor(message: string, options: MvsepErrorOptions = {}) {
    super(message, options);
    this.name = "MvsepTimeoutError";
  }
}

export class MvsepAbortError extends MvsepError {
  constructor(message = "MVSep request aborted", options: MvsepErrorOptions = {}) {
    super(message, options);
    this.name = "MvsepAbortError";
  }
}

export class MvsepJobFailedError extends MvsepApiError {
  readonly result: SeparationResult;

  constructor(result: SeparationResult) {
    super(result.data?.message ?? `MVSep job ended with status ${result.status}`, {
      response: result,
      retryable: false,
    });
    this.name = "MvsepJobFailedError";
    this.result = result;
  }
}
