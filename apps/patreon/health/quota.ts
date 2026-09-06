import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Patreon documents fixed ceilings — "Client: Up to 100 requests every 2
 * seconds" and "Access Token: Up to 100 requests per minute" — but exposes no
 * endpoint or response header that reads current headroom against either
 * one; a 429 response only optionally carries `retry_after_seconds`, which is
 * a backoff hint, not a remaining-quota reading. Declared rather than
 * omitted, per the same "we cannot know" vs "nobody looked" distinction as an
 * absent status service.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Patreon publishes no headroom endpoint or rate-limit-remaining headers. It documents " +
      "fixed ceilings (100 req/2s per client, 100 req/min per access token) but exhaustion " +
      "surfaces only as a 429, optionally carrying a `retry_after_seconds` backoff hint — not " +
      "a counter that can be read ahead of time.",
  },
};

export default quota;
