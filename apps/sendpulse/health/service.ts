import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is SendPulse up? — `status.sendpulse.com`, an Instatus-hosted page
 * (verified 2026-09-06: `/api/v2/summary.json` answers real, minimal JSON
 * `{"page":{"name":"SendPulse", "status":"UP"}}`, not a Statuspage/unclaimed
 * shape, and `/api/v2/components.json` lists genuine SendPulse components —
 * "REST API", "Authorisation Service", "Email Service", "Transactional
 * Emails", "CRM" among them — so it is neither an unclaimed decoy nor a
 * page that merely resembles a status feed).
 *
 * The summary/components JSON has no incident detail, only current
 * component state, so this reads `history.atom` instead — a genuine Atom
 * feed (confirmed `content-type: application/xml`, real `<entry>` elements)
 * that carries the full incident timeline this check needs to tell an
 * open incident from a resolved one.
 *
 * ## The ordering trap this feed sets that Statuspage does not
 *
 * Every other Atom-backed check in this pack (see `paypal`, `kustomer`)
 * reads a Statuspage feed, where one `<entry>` accumulates its incident's
 * updates NEWEST FIRST — so the first status word in the text is the
 * current one. SendPulse's Instatus feed puts them OLDEST FIRST: verified
 * against a live incident on 2026-09-06 whose `<entry>` read "Sep 4, 20:13
 * … Investigating … Sep 5, 06:09 … Resolved" — and whose `<published>`
 * timestamp matched the FIRST (Investigating) update, not the last, proving
 * the whole entry is written chronologically forward. Reusing the
 * "first status word wins" rule from a Statuspage-backed check against this
 * feed would read every resolved incident as still open. So the check below
 * takes the LAST status word in the entry, not the first.
 *
 * Scoped to the components this app actually touches: CRM and Bulk Email.
 * SendPulse's page also reports on Chatbots, Web Push, Landing Pages and
 * Courses — modules this app has no actions against — so an incident is
 * only counted if its "Affected Components" line names one of ours.
 */
const RELEVANT_COMPONENTS = ["REST API", "Authorisation Service", "Email Service", "CRM"];

/** Text of the entry's own "Affected Components: X, Y, Z" line, or `undefined` if absent. */
function affectedComponents(summary: string): string | undefined {
  const m = summary.match(
    /Affected Components:\s*(.+?)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/,
  );
  return m?.[1];
}

const STATUS_WORD = /\b(Investigating|Identified|Monitoring|Resolved|Completed)\b/g;

const service: HealthCheckDefinition = {
  key: "service",
  title: "SendPulse platform status",
  description: "SendPulse's own status feed (status.sendpulse.com), scoped to the REST API, " +
    "Authorisation Service, Email Service and CRM components. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.sendpulse.com/history.atom" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }
    const relevant = feed.latest.filter((e) => {
      const affected = affectedComponents(e.summary);
      return affected !== undefined &&
        RELEVANT_COMPONENTS.some((c) => affected.includes(c));
    });
    const open = relevant.filter((e) => {
      const words = [...e.summary.matchAll(STATUS_WORD)].map((m) => m[1]);
      const last = words[words.length - 1];
      return last !== undefined && !/^(resolved|completed)$/i.test(last);
    });
    return open.length === 0
      ? { state: "ok", ttlSeconds: 60 }
      : { state: "degraded", message: open.map((e) => e.title).join("; "), ttlSeconds: 60 };
  },
};

export default service;
