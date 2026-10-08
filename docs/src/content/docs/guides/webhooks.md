---
title: Webhook handling
description: Parse, correlate, deduplicate and independently verify webhook notifications.
---

MVSep can POST a notification to the `webhookUrl` supplied during creation. Its payload follows the same envelope as `GET /separation/get`.

```ts
import { MvsepWebhookReceiver } from '@rikhoffbauer/mvsep-client/webhooks';

const receiver = new MvsepWebhookReceiver({
  verify: async hash => client.getSeparation(hash),
});

const notification = await receiver.receive(
  'account-a', expectedHash, requestBody,
);
if (!notification.duplicate) console.log(notification.result);
```

## Critical security considerations

- **Treat the entire incoming payload as untrusted.** The API documentation does not define a signed webhook verification scheme. Protect the HTTP route yourself (secret path, gateway authentication or equivalent).
- **Match the expected account and hash** from your own job ledger. Never trust a hash alone to authorize a business action.
- **Re-fetch through an authenticated client** when the transition matters; use the optional `verify` callback shown above.
- **Expect duplicate deliveries.** The receiver provides bounded, time-limited, per-process deduplication. Use persistent deduplication if delivery guarantees must survive restarts.
- **Never submit a new paid job solely because a webhook arrived.**

For low-level workflows, use:

```ts
import { parseWebhook, reconcileWebhook } from '@rikhoffbauer/mvsep-client';

const parsed = parseWebhook(requestBody);
const verified = await reconcileWebhook(expectedHash, parsed, hash => client.getSeparation(hash));
```

Webhook processing is separate from polling. You can combine both to reconcile missed deliveries.
