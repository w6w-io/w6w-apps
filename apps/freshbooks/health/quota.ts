import type { HealthCheckDefinition } from "@w6w/types";

/**
 * FreshBooks exposes no headroom to read, so there is nothing to probe.
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 *
 * Verified 2026-09-01 against freshbooks.com/api/limits: "There are no
 * limit[s] on the number of API requests per day. However, requests will be
 * rate-limited if too many calls are made within a short period of time."
 * No numeric ceiling, and no `X-RateLimit-*`-shaped response header is
 * documented anywhere in the reference (clients, invoices, expenses,
 * time_entries, project pages all checked). Throttling exists but is
 * undocumented, so headroom cannot be read — only budgeted from observed
 * failures.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "FreshBooks documents no numeric request ceiling and no rate-limit response headers — only that short bursts may be throttled. Headroom cannot be read, only budgeted from observed failures.",
  },
};

export default quota;
