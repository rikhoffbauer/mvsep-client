---
title: TypeScript types
description: Important request, response, job handle, progress and batch interfaces.
---

All public types are exported from the package root, except module-specific helper types which can also be imported from their subpath.

## Separation inputs

```ts
interface BinaryPart {
  data: Blob | ArrayBuffer | Uint8Array;
  filename?: string;
  contentType?: string;
}

interface CreateSeparationInput {
  audiofile?: BinaryPart;
  targetAudiofile?: BinaryPart;
  referenceAudiofile?: BinaryPart;
  url?: string;
  remoteType?: 'direct' | 'mega' | 'drive' | 'dropbox';
  sepType?: number;
  presetId?: number;
  addOpt1?: string | number;
  addOpt2?: string | number;
  addOpt3?: string | number;
  additionalOptions?: Record<string, string | number | boolean>;
  outputFormat?: 0 | 1 | 2 | 3 | 4 | 5;
  isDemo?: boolean;
  webhookUrl?: string;
}
```

Pass either `sepType` or `presetId`, never both. A preset cannot be combined with single-algorithm output or additional option fields. Reserve core request parameters for the SDK.

## Job response

```ts
interface CreateSeparationResponse {
  success: boolean;
  data?: { hash?: string; link?: string; message?: string; [key: string]: unknown };
  message?: string;
  [key: string]: unknown;
}
interface SeparationResult {
  success: boolean;
  status: SeparationStatus;
  data?: SeparationResultData;
  [key: string]: unknown;
}
```

`SeparationStatus` includes `not_found`, `waiting`, `processing`, `distributing`, `merging`, `done` and `failed`; the type also accepts future status strings. `SeparationResultData` exposes `files`, queue position, chunk counters, hash, and additional upstream properties. A `SeparationFile` may contain `name`, `url`, `link`, `size`, `path` and arbitrary metadata.

## Algorithm metadata

`SeparationAlgorithm` has required `render_id: number` and `name: string`, and optional `audio_widget`, `price_coefficient`, `orientation`, `algorithm_fields` and other fields. `AlgorithmField.options` can be an array, an object or a JSON-encoded string. These structures are intentionally extensible to accommodate API changes.

## Job handles

```ts
interface MvsepJobHandle {
  version: 1;
  hash: string;
  submissionState?: 'pending';
  baseUrl: string;
  keyId?: string;
  algorithmId?: number;
  presetId?: number;
  inputId?: string;
  createdAt: string;
}
interface JobHandleStore {
  load(): Promise<MvsepJobHandle[]>;
  save(handles: readonly MvsepJobHandle[]): Promise<void>;
}
```

Accepted handles contain a nonempty `hash`. An empty hash with `submissionState: 'pending'` indicates a **write-ahead batch marker with unknown create outcome**, which must be reconciled before resubmission.

## Output types

`NormalizedOutput` includes `name`, `url`, optional numeric `size`, and unmodified `raw: SeparationFile`. `DownloadedFile` includes `path`, `url`, `name`, `loaded` and optional `total`. `OutputManifest` holds `files`, `errors: { name, message }[]` and optional `hash`.

## Discovery and account types

Typed account DTOs include `MvsepUser`, `MvsepQueue`, `MvsepQueueSummary`, `MvsepHistoryEntry`, `MvsepPurchases`, `MvsepCreditAlert`, `MvsepDemoEntry`, `MvsepLeaderboard`, `MvsepQualityEntry` and `NewsEntry`. All include supported known fields while retaining unknown server extensions.

## Pagination limits

| Query | Default / maximum |
| --- | --- |
| `getSeparationHistory({ start, limit })` | `limit` 10 / max 20 |
| `getPurchases({ offset, limit, status })` | `limit` 20 / max 100 |
| `getDemoSeparations({ start, limit, ... })` | `limit` 10 / max 20 |
| `getQualityLeaderboard({ start, limit, ... })` | `limit` 10 / max 20 |
| `getNews({ start, limit, lang })` | `limit` 10 / max 20 |

Unknown queue ETA is `null`, never a fabricated `0`.

## Progress union

`MvsepProgressEvent` is discriminated by `type`:

- `request`: `phase` is `start` or `success`, plus method/path/attempt context.
- `rate_limit`: includes `waitMs`.
- `retry`: includes `delayMs`, reason and optional status.
- `key_rotation`: includes source/destination key indices and reason.
- `poll`: includes job hash, status, polling elapsed time and optional queue/chunk/fraction fields.

These are lifecycle and server-progress signals, not portable upload-byte progress measurements.
