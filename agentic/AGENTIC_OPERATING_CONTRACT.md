# YorpHives — first-party Agentic Internet contract (November 2026)

## What is already live

YorpHives.com runs on Cloudflare Workers Static Assets for production, with
browser-local files and select low-cost Workers APIs. Existing 143 public
tools remain freely available on direct, searchable pages.

| Principle | Our actual implementation |
|---|---|
| Readable | Public HTML, JSON-LD, llms.txt, 143 static Markdown companions |
| Discoverable | Published catalog, OpenAPI 3.1, /api/agent/v1/tools and a site-specific /.well-known/agentic.json |
| Callable | Five vetted, stateless HTTPS/JSON utilities; matching local WebMCP tools in supported browsers |
| Identity | Public calculations require no login; future paid/privileged operations must verify identity first |
| Payable | Deliberately **not enabled**. No payment provider, billing scheme, wallet, or priced endpoint is implied |

Cloudflare Connect 2026 describes these as emerging directions, not one
mandatory pass/fail standard. Site-specific agentic.json is *not* an industry
standard. WebMCP remains a W3C Community Group draft, so incompatible browsers
simply ignore it.

## Portable, direct first-party interface

Public registry: `GET /api/agent/v1/tools`

OpenAPI: `GET /api/agent/v1/openapi.json`

One example with harmless sample numbers:

```bash
curl -fsS https://yorphives.com/api/agent/v1/tools
curl -fsS https://yorphives.com/api/agent/v1/tools/discount/invoke \
  -H 'content-type: application/json' \
  --data '{"price":100,"percent":15}'
```

Only `word_count`, `slugify`, `case_convert`, `percentage`, and
`discount` have remotely callable interfaces. All other catalog items
remain browser-local or human-facing. Do not send private documents, passwords,
keys or customer data to public stateless utility endpoints. Supported
browser-native WebMCP performs the same five operations **locally** without
uploading tool inputs.

The pure `agentic/tools-core.mjs` module runs on open-source Node.js,
while `agentic/portable-server.mjs` is a **working zero-dependency localhost HTTP
adapter** for the same published operations and machine-readable discovery.
It requires no Cloudflare credential, D1 database, KV store, AI service, or
subscription. Its in-memory admission control is suitable for an isolated
single-node portability proof, **not** a multi-node distributed public service.

For a private local test on your own computer, from the repository root:

```bash
node agentic/portable-server.mjs
# In a second Terminal:
curl -fsS http://127.0.0.1:8788/api/agent/v1/tools
curl -fsS http://127.0.0.1:8788/api/agent/v1/tools/discount/invoke \\
  -H 'content-type: application/json' --data '{"price":100,"percent":15}'
```

Port 8788 listens only on 127.0.0.1; no public internet access and no extra
system service are installed. The adapter never writes usage records or logs
request contents. A public self-hosted deployment would additionally require
TLS/reverse proxy, security monitoring, shared rate limiting, suitable network
firewall rules and separately approved release controls. Do **not** simply bind
this proof to a public network interface.

`agentic/invoke.mjs` performs request validation, rate-limit checks and
stateless invocation. Cloudflare production fails closed without its rate-limit
bindings; the portable adapter supplies its own bounded local admission logic.

## Security and cost

- JSON request body <=4096 bytes and strict per-tool schema with no extra keys.
- Cloudflare-native limiter: approx 30 calls/min per source and 160 calls/min
  per Cloudflare location across the utility interface. Neither represents
  billing-grade accounting or protection against distributed denial of service.
- Only named and approved operations accepted. No user accounts, HQ, D1 writes,
  external LLMs, paid APIs, remote files or arbitrary URL fetching.
- No cross-origin CORS grant on the POST endpoint. Non-browser HTTP clients can
  call directly. CORS alone is not API authentication.
- `AGENT_USAGE` is an **optional replaceable count-only adapter**.
  On success, it records only the preapproved tool ID and one count.
  No input strings, remote IP addresses, cookies, headers, identity or tokens.
  The website remains usable when telemetry is missing or offline.
- Native Cloudflare Workers Analytics Engine has a 100,000 data-point daily
  included allowance on Workers Free at this time; review limits and pricing
  as demand grows. The automatic dataset is
  `yorphives_agent_usage_v1`; preview uses a separate dataset.
- Analytics Engine has a roughly three-month retention window. Nothing in the
  public response claims actual paid conversion or revenue.

## Validating demand without inventing revenue

Once real calls are recorded, a founder-authorized read-only SQL query against
Cloudflare Workers Analytics Engine can list actual free-utility use:

```sql
SELECT blob1 AS tool,
       SUM(_sample_interval * double1) AS estimated_calls
FROM yorphives_agent_usage_v1
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY tool
ORDER BY estimated_calls DESC
LIMIT 10;
```

This dataset is aggregate-only and does not identify customers. These are
API calls, **not** advertising impressions, paid subscriptions or revenue.
Metric reporting inside private Headquarters should use a read-only,
authenticated adapter, not public SQL credentials or direct write permission.

## Later monetization — founder-owned decision gate

Potential future income requires proven repeated demand, a clearly licensed
premium product, unit economics, identity/authentication, payment eligibility,
legal/tax review, fraud control, refund policy, customer support and
founder-approved prices. Only then activate a provider-neutral payment adapter
(e.g. a compatible open payment protocol). There is **no** paid endpoint, x402
transaction, agent marketplace enrollment, third-party MCP intermediary,
subscription or wallet in this release.

HQ and its AI workforce stay research/monitor/recommend-only. They cannot
publish APIs, change source, approve payments or deploy code by themselves.
