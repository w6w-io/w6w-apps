import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of the "120 calls per minute" rate limit is left?
 *
 * There is nothing to read. The OpenAPI document's own introduction states
 * the limit in prose ("Currently, Agencyzoom has a rate limit of **120** calls
 * per minute", raised twice in the document's own change log), but:
 *
 *  - No path in the document declares a `429` response.
 *  - A live probe against `POST /v1/api/auth/login` on 2026-09-05 (a
 *    deliberately bad-credential `400`) carried no `X-RateLimit-*`,
 *    `RateLimit-*` or `Retry-After` header of any kind.
 *
 * A vendor that documents a ceiling but exposes no readable counter or 429
 * response leaves headroom unknowable rather than merely unread — probing
 * would mean guessing at a header shape nobody has documented and nothing on
 * the wire confirms. `severity: "informational"` — an `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so this
 * keeps the app's overall verdict from being pinned at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "AgencyZoom documents a 120-calls-per-minute limit in prose only: no endpoint documents " +
      "a 429 response, and a live probe (2026-09-05) carried no rate-limit header of any kind.",
  },
};

export default quota;
