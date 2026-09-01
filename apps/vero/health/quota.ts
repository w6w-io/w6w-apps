/**
 * Quota — declared absent, honestly.
 *
 * Neither Vero's API Overview nor any Track API endpoint page (checked while
 * building this app: identify, track, delete, alias, tags/edit, resubscribe,
 * unsubscribe) documents a rate-limit header or a proactive quota surface.
 * A live, unauthenticated `POST /users/track` on 2026-09-01 returned no
 * `X-RateLimit-*`, `RateLimit-*`, or `Retry-After` header on its `401`
 * response. Vero's docs mention "rate limits" only for MCP requests (a
 * different surface this app does not call) and for email-client-side
 * deliverability throttling, which is not something an API caller can read.
 *
 * Per rfcs/healthcheck.md: "Say so when a vendor publishes nothing" — an
 * `unavailable` entry is a first-class answer, not an omission, and
 * `severity: "informational"` keeps a permanent `unknown` from pinning this
 * App's roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Vero's Track API documents no rate-limit header or proactive quota signal on any " +
      "endpoint (confirmed live 2026-09-01 against an unauthenticated response's headers), and " +
      "the only 'rate limit' referenced in its docs applies to a different surface (MCP).",
  },
};

export default quota;
