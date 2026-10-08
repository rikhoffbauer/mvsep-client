# MVSep documentation playground relay

Stateless HTTPS bridge for `https://rikhoffbauer.github.io/mvsep-client/playground/`.
MVSep currently does not return browser CORS headers. GitHub Pages cannot host a backend.

- Fixed upstream `https://*.mvsep.com/api` hosts and fixed GET/POST endpoint allowlists.
- CORS restricted to the GitHub Pages origin and local Astro preview.
- Credentials arrive in `X-Mvsep-Token` over HTTPS and are never included in the **relay** URL.
- The remote API requires its token in an upstream query string (GET) or multipart form (POST).
- The relay does not persist, log or cache credentials, bodies or responses. It redacts token fields from JSON responses.
- No third-party URLs or arbitrary outgoing requests; no redirects followed.
- No cookies, sessions or account storage.
- Best-effort per-instance rate limiting is not a global DDoS shield. Additional Vercel firewall protections are recommended.
- Multipart payloads are capped to 3 MiB due to serverless request limits. Prefer remote audio URLs.

API keys are **still transmitted through the Vercel-hosted relay** and onward to MVSep. The browser UI must display this fact and obtain explicit opt-in. Users who cannot trust the relay should not enter their credentials.

Run unit tests:

```bash
cd playground-relay
node --test test/*.test.mjs
```

The relay is deployed on Vercel at `https://mvsep-client-playground.vercel.app/api/relay` from the GitHub repository using project root `playground-relay/`. Future pushes to `main` rebuild the production relay automatically. In docs CI, configure `PUBLIC_MVSEP_RELAY_URL` to the actual deployed `https://.../api/relay` endpoint.
