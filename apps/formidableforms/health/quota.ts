import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Nothing meters these calls, so there is no headroom to read.
 *
 * The Formidable REST API v3 rides on the site's own WordPress REST API.
 * Neither the vendor's endpoint reference nor its Application Password
 * authentication guide documents a rate limit or a usage-headroom response
 * header — the only ceiling is whatever the customer's web host, PHP
 * configuration or a security plugin imposes, and none of those publish a
 * number.
 *
 * Declared rather than omitted, for the same reason as the absent `service`
 * check: a host should be able to tell "we cannot know" from "nobody
 * looked".
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
      "Formidable REST API v3 rides on the site's own WordPress REST API. Neither documents a " +
      "rate limit nor returns usage headers, and a self-hosted site imposes whatever limits its " +
      "own web host does — none of which are readable over the API.",
  },
};

export default quota;
