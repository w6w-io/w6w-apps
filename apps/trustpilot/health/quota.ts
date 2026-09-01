/**
 * Quota headroom — a declared absence, not a guess.
 *
 * Trustpilot's "Rate limiting best practices" page (read 2026-09-01) recommends staying
 * under 833 calls/5 minutes or 10K calls/hour, and its remedy for a `429` is client-side
 * — "reuse your valid authentication token", "avoid pulling data if you can use webhooks
 * instead", "store and update data in your backend". Nowhere does it document a response
 * header carrying a remaining count, a ceiling, or a reset time (contrast Apify's
 * `X-RateLimit-Limit` or GitHub's `x-ratelimit-remaining`), and neither the Business
 * Units, Product Reviews nor Invitations reference pages show one in a worked response
 * example either.
 *
 * With nothing to read, this is declared `unavailable` rather than invented. Left at
 * `informational` severity deliberately: an `unavailable` check always reports `unknown`,
 * and `unknown` outranks `ok` in a roll-up, so any other severity would pin this app's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Trustpilot documents fixed rate-limit ceilings (833 calls/5 min, 10K/hour) " +
      "but publishes no response header or endpoint reporting a remaining count or reset " +
      "time on any of its APIs — the only signal it names is the 429 itself.",
  },
};

export default quota;
