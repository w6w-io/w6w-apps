import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Kustomer's platform status — a real Statuspage.io instance.
 *
 * Verified 2026-08-29: `https://status.kustomer.com/api/v2/status.json`
 * answers `{"page": {...}, "status": {"indicator", "description"}}`, and
 * `https://status.kustomer.com/history.atom` is a genuine Atom incident-
 * history feed (confirmed `content-type: application/atom+xml`, real
 * `<entry>` elements with `<published>`/`<updated>` timestamps). The feed is
 * used here rather than the summary JSON endpoint because `check`/`feed` is
 * the host-parsed primitive this spec provides (see
 * `core/docs/build-a-w6w-app.md` § Health checks); a bespoke JSON fetch would
 * duplicate that machinery for no benefit.
 *
 * `latest` (not `entries`) is read deliberately: a Statuspage Atom feed emits
 * one entry per incident *update*, so the newest entry for an incident
 * resolved days ago still carries that incident's original title. Judging
 * on the newest raw entry would report a stale outage as ongoing.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Kustomer platform status",
  description: "Kustomer's own Statuspage.io incident history.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.kustomer.com/history.atom" },

  check({ feed }, _ctx) {
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }
    // Kustomer's Statuspage feed keeps one <entry> per incident, with every
    // update (Investigating -> Identified -> Monitoring -> Resolved) appended
    // to that ONE entry's content, newest first. So the incident's CURRENT
    // state is whichever status word appears FIRST in the plain-text summary,
    // not whether the word "Resolved" appears anywhere in it.
    const STATUS_WORD = /\b(Resolved|Monitoring|Identified|Investigating)\b/i;
    const open = feed.latest.filter((e) => {
      const current = e.summary.match(STATUS_WORD)?.[1];
      return current !== undefined && current.toLowerCase() !== "resolved";
    });
    return open.length === 0
      ? { state: "ok", ttlSeconds: 300 }
      : { state: "degraded", message: open.map((e) => e.title).join("; "), ttlSeconds: 300 };
  },
};

export default service;
