import { MvsepApiError } from "./errors.js";
import type { CreateSeparationInput, SeparationAlgorithm, SeparationResult, SeparationFile } from "./types.js";
import type {
  JobCostEstimate, NormalizedOutput, PrepareSeparationOptions, PreparedSeparation, ValidateOptions,
} from "./extended-types.js";

/** Unknown prices are null, never treated as free. */
export function estimateJobCredits(
  algorithm: SeparationAlgorithm,
  durationSeconds?: number,
): JobCostEstimate {
  if (durationSeconds !== undefined && (!Number.isFinite(durationSeconds) || durationSeconds < 0))
    throw new RangeError("durationSeconds must be finite and nonnegative");
  const coefficient = algorithm.price_coefficient;
  const known = typeof coefficient === "number" && Number.isFinite(coefficient) && coefficient > 0 &&
    durationSeconds !== undefined && algorithm.audio_widget !== "no_upload";
  return {
    algorithmId: algorithm.render_id,
    durationSeconds: durationSeconds ?? null,
    coefficient: typeof coefficient === "number" && Number.isFinite(coefficient) && coefficient > 0 ? coefficient : null,
    estimatedCredits: known ? Math.max(1, Math.floor(durationSeconds! * coefficient / 60)) : null,
    isEstimate: true,
    ...(!known ? { reason: "Duration, price coefficient or pricing model is unknown" } : {}),
  };
}

interface DeclaredField {
  name: string;
  keys: Set<string>;
  labels: Map<string, string>;
  defaultKey?: string;
}
function declaredOptions(algorithm: SeparationAlgorithm): Map<string, DeclaredField> {
  const result = new Map<string, DeclaredField>();
  for (const field of algorithm.algorithm_fields ?? []) {
    if (typeof field.name !== "string") continue;
    let rawOptions: unknown = field.options;
    if (typeof rawOptions === "string") {
      try { rawOptions = JSON.parse(rawOptions); }
      catch { throw new TypeError("Invalid JSON options for " + field.name); }
    }
    const keys = new Set<string>();
    const labels = new Map<string, string>();
    const add = (key: string, label: unknown) => {
      keys.add(key);
      if (typeof label === "string") {
        const normalized = label.toLowerCase();
        if (labels.has(normalized) && labels.get(normalized) !== key) labels.set(normalized, "");
        else labels.set(normalized, key);
      }
    };
    if (rawOptions && typeof rawOptions === "object") {
      if (Array.isArray(rawOptions)) {
        for (const option of rawOptions) {
          if (option && typeof option === "object" && option.key !== undefined)
            add(String(option.key), option.value ?? option.name);
        }
      } else {
        for (const [key, label] of Object.entries(rawOptions)) add(key, label);
      }
    }
    const defaultKey = field.default_key === undefined ? undefined : String(field.default_key);
    if (defaultKey !== undefined && keys.size && !keys.has(defaultKey))
      throw new TypeError("Invalid default_key for " + field.name);
    const declared: DeclaredField = {
      name: field.name, keys, labels, ...(defaultKey !== undefined ? { defaultKey } : {}),
    };
    result.set(field.name, declared);
    if (typeof field.text === "string" && field.text !== field.name) {
      if (result.has(field.text)) throw new TypeError("Ambiguous field label " + field.text);
      result.set(field.text, declared);
    }
  }
  return result;
}

/** Validate a configured separation against a live algorithm metadata snapshot. */
export function validateSeparation(
  input: CreateSeparationInput,
  algorithm: SeparationAlgorithm,
  options: ValidateOptions = {},
): void {
  const strict = options.strict ?? true;
  if ((algorithm.orientation === 1 && options.registered === false) ||
      (algorithm.orientation === 2 && options.premium === false))
    throw new TypeError("Algorithm requires an account entitlement unavailable to this caller");
  if (input.presetId !== undefined) throw new TypeError("Preset runs have independent metadata");
  if (input.sepType !== undefined && input.sepType !== algorithm.render_id)
    throw new TypeError("sepType does not match algorithm.render_id");
  const widget = algorithm.audio_widget;
  const hasSingle = Boolean(input.audiofile || input.url);
  const hasPair = Boolean(input.targetAudiofile && input.referenceAudiofile);
  if (widget === "single_upload" && !hasSingle) throw new TypeError("Algorithm requires one audio input");
  if (widget === "matchering_upload" && !hasPair) throw new TypeError("Algorithm requires target and reference audio");
  if (widget === "no_upload" && (hasSingle || hasPair))
    throw new TypeError("No-upload algorithm does not accept audio");
  const fields = declaredOptions(algorithm);
  for (const [name, value] of Object.entries({
    add_opt1: input.addOpt1, add_opt2: input.addOpt2, add_opt3: input.addOpt3,
  })) {
    if (value === undefined) continue;
    const field = fields.get(name);
    if (!field) {
      if (strict) throw new TypeError("Unknown algorithm field: " + name);
      continue;
    }
    if (field.keys.size && !field.keys.has(String(value)))
      throw new TypeError("Invalid value for " + name + ": " + String(value));
  }
}

/** Maps only documented field names; never guesses option indices. */
export function prepareSeparation(options: PrepareSeparationOptions): PreparedSeparation {
  const fields = declaredOptions(options.algorithm);
  const input: CreateSeparationInput = { ...options.input, sepType: options.algorithm.render_id };
  for (const [name, value] of Object.entries(options.fields ?? {})) {
    const field = fields.get(name);
    if (!field) {
      if (options.strict !== false) throw new TypeError("Unrecognized algorithm field: " + name);
      if (!["add_opt1", "add_opt2", "add_opt3"].includes(name))
        throw new TypeError("Only add_opt1..3 can be sent to the MVSep create endpoint");
    }
    const canonicalName = field?.name ?? name;
    const rawValue = String(value);
    const mappedLabel = field?.labels.get(rawValue.toLowerCase());
    const resolved = field?.keys.has(rawValue) ? value : mappedLabel;
    if (mappedLabel === "" || (field?.keys.size && resolved === undefined))
      throw new TypeError("Invalid or ambiguous option for " + name + ": " + rawValue);
    if (canonicalName === "add_opt1") input.addOpt1 = resolved ?? value;
    else if (canonicalName === "add_opt2") input.addOpt2 = resolved ?? value;
    else if (canonicalName === "add_opt3") input.addOpt3 = resolved ?? value;
    else throw new TypeError("Only add_opt1..3 can be sent to the MVSep create endpoint");
  }
  validateSeparation(input, options.algorithm, { strict: options.strict ?? true });
  return { input, algorithm: options.algorithm };
}

/** Normalize output entries without inventing stem names or discarding raw metadata. */
export function getOutputFiles(result: SeparationResult): NormalizedOutput[] {
  if (!Array.isArray(result.data?.files)) return [];
  return result.data.files.flatMap((raw: SeparationFile, index): NormalizedOutput[] => {
    const url = raw.url ?? raw.link;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) return [];
    const name = typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : "output-" + (index + 1);
    const parsedSize = typeof raw.size === "number" ? raw.size :
      (typeof raw.size === "string" && raw.size.trim() ? Number(raw.size) : NaN);
    return [{ name, url, ...(Number.isFinite(parsedSize) && parsedSize >= 0 ? { size: parsedSize } : {}), raw }];
  });
}

/** Sanitizes filenames to a single portable basename (no path traversal). */
export function safeOutputFilename(name: string): string {
  const sanitized = name.replace(/[\\/\x00-\x1f\x7f:<>|"*?]/g, "_").replace(/^\.+/, "_").trim();
  return sanitized && sanitized !== "." && sanitized !== ".." ? sanitized.slice(0, 200) : "output";
}

/** MVSep documents an unsigned POST of the GET /separation/get envelope. */
export function parseWebhook(body: string | unknown): SeparationResult {
  let parsed = body;
  if (typeof body === "string") {
    try { parsed = JSON.parse(body); }
    catch { throw new MvsepApiError("Malformed MVSep webhook JSON"); }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      typeof (parsed as SeparationResult).success !== "boolean" ||
      typeof (parsed as SeparationResult).status !== "string") {
    throw new MvsepApiError("Invalid MVSep webhook payload");
  }
  return parsed as SeparationResult;
}

/**
 * Webhooks are untrusted: correlate hashes, then optionally verify using the API.
 * Caller must independently authenticate the HTTP request.
 */
export async function reconcileWebhook(
  hash: string,
  payload: unknown,
  verify?: (hash: string) => Promise<SeparationResult>,
): Promise<SeparationResult> {
  const result = parseWebhook(payload);
  if (!hash || result.data?.hash !== hash)
    throw new MvsepApiError("MVSep webhook hash mismatch");
  return verify ? verify(hash) : result;
}
