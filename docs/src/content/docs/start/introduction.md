---
title: Introduction
description: What the SDK does and how it approaches paid job safety.
---

**MVSep Client** is an independently maintained TypeScript SDK for the [MVSep API](https://mvsep.com/en/full_api). It supports Node.js 20+ and Bun with no mandatory runtime dependencies.

## What it provides

- Create jobs from audio files, URLs, presets, matchering pairs, or no-upload algorithm options.
- Discover current algorithms and validate options against live model metadata.
- Track queue states, poll through completion, and receive structured progress events.
- Stream results to disk or a `WritableStream<Uint8Array>` with bounded memory and safe temporary files.
- Manage multiple API keys, account profiles and premium credit estimates.
- Persist job handles and orchestrate batches without automatically repeating uncertain submissions.
- Use the library directly or through its `mvsep` command-line tool.

## Design principles

**Paid operations are not assumed idempotent.** MVSep does not publish a create-job idempotency key. If a connection breaks after submitting, the job may still exist. The SDK's default retry policy does not replay ambiguous create failures.

**Local cancellation is not remote cancellation.** An `AbortSignal` stops local network activity and waiting; it does not cancel an accepted job. Explicitly call `cancelSeparation(hash)` for that.

**Metadata is live, not hardcoded.** Use `getAlgorithms()` or `getAlgorithm(id)` to discover current model identifiers and option values rather than relying on examples forever.

**No hidden spend.** Budget guardrails are opt-in and fail closed on unknown prices. Premium usage is never automatically enabled.

Start with [installation](/mvsep-client/start/installation/) and [quick start](/mvsep-client/start/quickstart/).
