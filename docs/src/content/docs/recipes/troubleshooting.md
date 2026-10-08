---
title: Troubleshooting
description: Diagnose installs, API keys, polling, transfers and common integration mistakes.
---

## GitHub installation says 404

The repository may be private. `github:owner/repo` can access GitHub's unauthenticated tarball endpoint. Use SSH instead:

```bash
ssh -T git@github.com
bun add git@github.com:rikhoffbauer/mvsep-client.git
npm install 'git+ssh://git@github.com/rikhoffbauer/mvsep-client.git'
```

## No API key or unauthorized

Pass `apiKeys` in the constructor, or export `MVSEP_API_KEY` for CLI use. A 401 may disable that key for the client's lifetime; inspect `apiKeyState` without revealing secrets. For account-bound jobs check key affinity and stable identifiers.

## Polling exceeds its deadline

`maxWaitMs` is wall-clock time, including network waits. Increase it or adopt webhooks for long jobs. Aborting polling **does not** cancel an accepted job.

## The output directory does not exist

Create it before `downloadSeparationOutputs()` or `downloadToFile()`:

```ts
import { mkdir } from 'node:fs/promises';
await mkdir('./stems', { recursive: true });
```

## HTTP 429 / overload

The SDK handles `Retry-After` and key cooldown. Tune HTTP `requestsPerSecond` and `maxConcurrency` independently of server job quotas. Do not rotate accounts merely to evade limits.

## A create timed out — can I retry?

Not safely without further checking. A failed transport may mask an accepted paid job. Query account history and reconcile any existing job before resubmitting. The batch runner deliberately leaves a `pending` marker for uncertain creates.

## Missing functionality in the reference?

Use the "Edit page" link or open an issue on [GitHub](https://github.com/rikhoffbauer/mvsep-client/issues). The low-level [`request<T>()`](/reference/client/) method can access endpoints without dedicated wrappers.
