/**
 * Do we have rate-limit headroom left? — declared absent, not guessed.
 *
 * LearnWorlds' own API spec states a fixed prose limit ("Rate limit of 30
 * requests / 10 sec") and a `429 {"error": "Too many requests"}` response
 * shape, but documents no `X-RateLimit-*` (or any other) response header
 * carrying a remaining count or reset time on a successful response —
 * checked against every parameter and response defined across all 94
 * documented v2 operations. There is nothing for a side-effect-free probe to
 * read; the only usage signal is the 429 itself, which this check would have
 * to spend a real request to provoke.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict
 * at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Not exposed: LearnWorlds documents a fixed 30 requests/10s limit and a 429 error shape, " +
    "but no response header or endpoint reports remaining headroom.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No rate-limit response header or quota endpoint is documented anywhere across the v2 API.",
  },
};

export default quota;
