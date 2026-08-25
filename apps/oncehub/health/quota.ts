import type { HealthCheckDefinition } from "@w6w/types";

/**
 * OnceHub documents fixed rate limits — 5 requests/second per account, 200
 * requests/5 minutes per IP (https://help.oncehub.com/developers/overview/rate-limits/)
 * — but exposes no headroom to read: no `/usage` or `/limits` endpoint, and
 * no `X-RateLimit-*` / `RateLimit-*` response headers on any documented
 * success or error response (checked every response in the OpenAPI document,
 * including the `429` examples, which carry only `{ type: "rate_limit_error",
 * message }` and no numeric headers). Declared rather than omitted, for the
 * same reason as an absent status service: a host should be able to tell "we
 * cannot know" from "nobody looked". Verified 2026-08-25.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict on its own.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "OnceHub's API v2 documents fixed rate limits (5 req/s per account, 200 req/5min per IP) but no headroom endpoint and no rate-limit response headers, so headroom cannot be read — only budgeted from observed 429s.",
  },
};

export default quota;
