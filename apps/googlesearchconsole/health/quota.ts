import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Search Console meters hard — Search Analytics alone has short-term
 * (10-minute) and long-term (1-day) load quotas plus per-site/per-user/
 * per-project QPS/QPM/QPD ceilings, and URL Inspection has its own separate
 * per-site and per-project QPM/QPD budget — but publishes nothing to read.
 *
 * Checked before being written off rather than assumed: Google's own limits
 * documentation (`developers.google.com/webmaster-tools/limits`, fetched
 * 2026-09-05) describes every quota category above in detail and states
 * "Users can monitor their current API usage in the quota tab of their
 * Google API Console project" — i.e. the Cloud Console UI, not a field, an
 * endpoint, or a response header this API exposes. A live unsigned request
 * to `webmasters/v3/sites` (2026-09-05) carries no `ratelimit`/`quota`
 * response header of any kind.
 *
 * Declared rather than omitted: a host should be able to tell "we cannot
 * know" from "nobody looked". `severity: "informational"` — an `unavailable`
 * entry reports `unknown`, and an informational check never worsens a
 * roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Google documents Search Console's quota categories (Search Analytics load and QPS " +
      "limits; URL Inspection QPM/QPD; general per-user and per-project QPS/QPM/QPD) but " +
      "exposes none of them through the API itself — the docs point to the quota tab of the " +
      "Google API Console project as the only place to read current usage. No response header " +
      "or endpoint reports consumption or headroom.",
  },
};

export default quota;
