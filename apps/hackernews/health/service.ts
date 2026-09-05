import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is the Hacker News API up?
 *
 * ## No status page to check
 *
 * The Firebase-hosted `hacker-news.firebaseio.com` API has no dedicated status
 * page, feed, or dashboard of its own — it is a read replica of HN's internal
 * data, not a separately-operated product with its own status surface. There is
 * therefore nothing out-of-band to declare `unavailable` and point at instead.
 *
 * ## `GET /v0/maxitem.json` is the narrowest live probe available
 *
 * It needs no credential (there is none — see `lib/client.ts`'s module doc),
 * touches no specific item or user, and is the cheapest documented endpoint:
 * the README describes it as a single integer, so this check reads the body
 * and confirms it is a plausible positive integer rather than trusting a bare
 * `200`. A vendor outage on this API has previously surfaced as a 200 with an
 * empty or non-numeric body from Firebase's edge, which a bare status check
 * would miss.
 */
export const HEALTH_PATH = "/maxitem.json";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hacker News API reachable",
  description:
    "Hacker News publishes no dedicated status page for its Firebase-hosted v0 API — this GETs " +
    "/v0/maxitem.json (no credential needed) and confirms the body is a plausible integer.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${HEALTH_PATH}`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${API_BASE}${HEALTH_PATH}: ${String(err)}`,
      };
    }
    const latencyMs = Date.now() - started;

    if (res.status >= 500) {
      return { state: "down", message: `Hacker News API returned ${res.status}`, latencyMs };
    }
    if (!res.ok) {
      return { state: "unknown", message: `Hacker News API returned ${res.status}`, latencyMs };
    }

    const text = await res.text();
    const id = Number(text);
    if (!text || !Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
      return {
        state: "unknown",
        message: `maxitem.json answered 200 with an implausible body: ${JSON.stringify(text)}`,
        latencyMs,
      };
    }

    return { state: "ok", message: `healthy, ${latencyMs}ms`, latencyMs, ttlSeconds: 60 };
  },
};

export default service;
