import type { HealthCheckDefinition } from "@w6w/types";

/**
 * MessageBird publishes fixed, documented per-method rate limits (e.g.
 * `POST /messages` at 500 req/s) but exposes no response headers or endpoint
 * to read remaining headroom against them — a 429 is the only signal, and it
 * arrives after the fact. Declared rather than omitted, so a host can tell
 * "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`,
 * which must never worsen this app's overall verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "MessageBird documents fixed per-method rate limits (e.g. 500 req/s for POST /messages) but publishes no rate-limit response headers or balance/quota endpoint to read remaining headroom against them — only a 429 once the limit is already exceeded.",
  },
};

export default quota;
