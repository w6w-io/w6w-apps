import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Freshsales's docs document a rate limit in prose ("1000 API requests per
 * hour per account" — same §Errors section as the 429 status code) but,
 * unlike the sibling Freshdesk/Freshservice apps in this pack, publish no
 * `X-RateLimit-*` (or any other) response headers to read the remaining
 * headroom from — verified: no `X-` header of any kind appears anywhere on
 * developers.freshworks.com/crm/api/ except the unrelated `X-UA-Compatible`
 * meta tag. Declared absent rather than omitted, so a host can tell "we
 * looked and there is nothing" from "nobody looked". `severity:
 * "informational"` because a declared absence always reports `unknown`, and
 * this must never pin the App's rolled-up verdict there.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Freshsales documents a 1000-requests-per-hour-per-account cap in prose but publishes no " +
      "response header (or other mechanism) to read the remaining headroom from.",
  },
};

export default quota;
