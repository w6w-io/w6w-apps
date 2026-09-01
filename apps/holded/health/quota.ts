/**
 * Quota headroom — declared unavailable.
 *
 * Holded's marketing "developers" page claims two parallel rate-limit windows
 * and `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` /
 * `X-RateLimit-Window` response headers, but that same page also claims
 * `Bearer` auth against `/api/v2/...` paths — both directly contradicted by
 * the live API (see `lib/client.ts`). Once one technical claim on that page is
 * proven fabricated, none of the others can be trusted without independent
 * confirmation.
 *
 * Live probes on 2026-09-01 found no `X-RateLimit-*` (or any other
 * rate-limit-shaped) header on either an unauthenticated `401` or an
 * invalid-key `400` response from `GET /api/crm/v1/funnels`. That is not
 * conclusive — a real per-key limit could plausibly only appear on a
 * successfully authenticated response, which this app has no live key to
 * generate — but it means there is no *verified* header name or field to read,
 * and inventing one to match unverifiable marketing copy would be worse than
 * declaring the gap honestly.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Holded documents no verifiable rate-limit response headers or quota endpoint. Its " +
      "marketing 'developers' page claims X-RateLimit-* headers, but that page's other " +
      "technical claims (Bearer auth, /api/v2/ paths) are contradicted by the live, " +
      "documented API, and live probes on 2026-09-01 found no rate-limit header on any " +
      "unauthenticated or invalid-key response.",
  },
};

export default quota;
