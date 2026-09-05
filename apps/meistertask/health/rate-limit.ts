/**
 * Rate-limit headroom — declared unavailable.
 *
 * MeisterTask's own docs (https://developers.meistertask.com/reference/rate-limiting)
 * state the ceiling — 120 requests per 60 seconds, with a client **blocked
 * for 180 seconds** on the 429 that signals it was exceeded — but publish no
 * header of any kind carrying a remaining count or a reset time. Live
 * responses from `GET /persons/me` and `GET /projects` were checked on
 * 2026-09-05: no `X-RateLimit-*`, `RateLimit-*` or vendor-prefixed header of
 * any shape was present on success or on a 4xx.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, `unknown` outranks `ok` in the roll-up, and at any other
 * severity this would pin the App's overall verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "Rate-limit headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "MeisterTask documents a fixed ceiling (120 requests/60s, 180s block on excess) " +
      "but publishes no header carrying a remaining count or reset time on any response — " +
      "checked live against /persons/me and /projects on 2026-09-05.",
  },
};

export default rateLimit;
