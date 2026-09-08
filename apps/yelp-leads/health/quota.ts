import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Do we have quota left?
 *
 * Yelp documents the Leads API's rate limit entirely in prose: "All the Leads
 * API endpoints have a default rate limit of 5 requests per second per
 * client per endpoint. The limits are configurable for clients, contact us
 * to know more" (`docs.developer.yelp.com/docs/leads-api`, "Rate Limiting").
 *
 * That is a fixed per-endpoint ceiling, not a consumable balance, and no
 * response header of any kind is documented anywhere in the seven Leads
 * endpoints' shared OpenAPI schema — every response object was read in full
 * on 2026-09-06 and none declares an `X-RateLimit-*`/`RateLimit-*` header.
 * There is no endpoint or header this app could read to report remaining
 * headroom, so this is a declared absence rather than a guess.
 *
 * `severity: "informational"` for the same reason as `service.ts`: an
 * `unavailable` entry always reports `unknown`, which would otherwise pin
 * this App's roll-up at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "The Leads API's 5 requests/second/client/endpoint limit is documented in prose " +
      "only (docs.developer.yelp.com/docs/leads-api, 'Rate Limiting') — no response header or " +
      "dedicated endpoint exposes remaining headroom on any of the seven Leads operations " +
      "(their shared OpenAPI document declares no X-RateLimit-*/RateLimit-* header anywhere, " +
      "checked 2026-09-06).",
  },
};

export default quota;
