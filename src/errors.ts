import type { SeparationResult } from "./types.js";

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
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "MvsepError";
    this.status = options.status;
    this.response = options.response;
    this.method = options.method;
    this.url = options.url;
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
