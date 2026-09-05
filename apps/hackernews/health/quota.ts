import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is there quota headroom left?
 *
 * The README states this explicitly rather than leaving it undocumented: "We
 * hope to improve the API over time... There is currently no rate limit."
 * There is no quota, credit, or throttling mechanism of any kind to probe, and
 * no response header carries one either (verified against live responses from
 * `/v0/maxitem.json` and `/v0/item/1.json` on 2026-09-05 — no `x-ratelimit-*`
 * or similar header on either).
 *
 * Declared absent rather than omitted, so a host can tell "we looked and there
 * is nothing" from "nobody looked". `severity: "informational"` because a
 * declared absence always reports `unknown`, and this must never pin the App's
 * rolled-up verdict there.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "The Hacker News API README states there is currently no rate limit, and no response " +
      "carries a quota or rate-limit header of any kind.",
  },
};

export default quota;
