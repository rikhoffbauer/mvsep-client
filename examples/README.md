# MVSep SDK examples

The complete, typechecked examples here accompany the [Starlight example gallery](https://mvsep-client.vercel.app/recipes/example-gallery/). Run them from the repository root with Bun.

## Safe to run offline

```bash
bun run examples/workflow.ts
bun run examples/key-rotation.ts
bun run examples/key-affinity.ts
bun run examples/offline-diagnostics.ts
bun run examples/credit-guards.ts
bun run examples/local-artifact-cache.ts
```

They use mock HTTP responses and do not require API keys, network access or paid credits.

## Live, read-only API

```bash
bun run examples/discover-algorithms.ts
bun run examples/metadata-and-cache.ts
MVSEP_API_KEY=... bun run examples/account-inspection.ts
MVSEP_API_KEY=... bun run examples/raw-request.ts
```

## Remote changes (could incur charges)

`process-file.ts` and `batch-jobs.ts` both require **`MVSEP_ALLOW_PAID=1`** in addition to `MVSEP_API_KEY` and `MVSEP_MODEL_ID`. They deliberately refuse to run without explicit opt-in. Example URLs in `batch-jobs.ts` must be replaced with actual reachable audio URLs. Review expected credit costs before starting.

`download-job.ts` fetches the outputs of an existing hash without submitting a new job. `webhook-server.ts` listens on localhost and must be placed behind a secured TLS proxy if publicly reachable.

## Verify

```bash
bun run check
```

Root TypeScript configuration checks the examples against the source SDK. The five offline examples are also executed by the documentation deployment workflow.
