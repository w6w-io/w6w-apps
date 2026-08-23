/**
 * What has happened to Slack lately? — the published incident feed.
 *
 * This is a companion to `service`, not a replacement for it. `service` reads
 * Slack's JSON status API, which is authoritative for what is broken RIGHT NOW.
 * This reads the Atom feed, which is the vendor's incident HISTORY — including
 * incidents that have already closed and so have vanished from `active_incidents`.
 *
 * That gap is the reason to run both. A workflow that failed twenty minutes ago
 * and works now correlates with an incident that resolved in between, and the
 * current-state API cannot tell you it ever happened. This check can.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — it speaks about the vendor's platform, like `service`.
 *   - `scope: "app"` (the default) — identical for every Connection, so the host
 *     runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection, no `sign`. The
 *     `feed` declaration requires an unsigned posture, because a status host is
 *     exactly the kind that must never see a credential.
 *   - `feed` — declared, not fetched here: the host fetches and parses it and
 *     hands the entries over as `input.feed`. The feed lives on
 *     `slack-status.com`, a DIFFERENT host from the `status.slack.com` that
 *     serves the JSON API and different again from the `slack.com` the app's
 *     actions call. Declaring it adds that host to this hook's allowlist
 *     implicitly, and to no other hook's.
 *   - `severity: "informational"` — load-bearing. History is context for a
 *     human, and an incident that already closed must never drag a roll-up
 *     verdict down; `service` owns the verdict.
 *
 * Slack publishes the same content as Atom (`/feed/atom`) and RSS
 * (`/feed/rss`). Atom is the one declared because its `<updated>` says when an
 * incident last CHANGED, where RSS's `<pubDate>` conflates that with when it
 * was first posted — and "changed lately" is the question being asked.
 *
 * ## The timeline is the FULL history, not the 7-day window `message` narrates
 *
 * `message` above stays exactly as it was — a human-glance summary of what
 * changed in the last week. `timeline` is a separate, wider surface: every
 * entry in `feed.latest` (the feed's own successive-updates-folded-to-newest
 * view), because a chart of incident history over months is the reason this
 * project reads the feed's FULL history rather than only the recent window.
 * Reusing `recent` here would silently cap that history at 7 days.
 *
 * Each entry's `state` comes from the same `Incident:` / `Notice:` title label
 * `isIncident` already reads below — never from `entry.summary` or
 * `entry.summaryHtml`. `resolvedAt` is never set: the Atom feed states
 * resolution only in prose ("Resolved - …"), and this project forbids
 * inferring it from prose, the same discipline `service.ts` follows for its
 * own timeline. A feed that failed to fetch, or one with no entries at all,
 * publishes no timeline (`undefined`) — that is different from a feed that
 * legitimately says nothing has happened.
 */
import type { HealthCheckDefinition, HealthTimelineEntry } from "@w6w/types";

/** How far back an entry still counts as "lately". */
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Slack titles its entries `Incident: …` or `Notice: …`. */
function isIncident(title: string): boolean {
  return /^\s*incident\b/i.test(title);
}

/** Strips the `Incident: ` / `Notice: ` label Slack prefixes every title with. */
function stripTitlePrefix(title: string): string {
  return title.replace(/^\s*(?:incident|notice):\s*/i, "");
}

const incidents: HealthCheckDefinition = {
  key: "incidents",
  title: "Recent incident history",
  description:
    "Incidents Slack published in the last week, from its Atom feed. Context only — `service` is authoritative for current state, and this never affects a verdict. `timeline` carries the feed's full folded history.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  feed: { url: "https://slack-status.com/feed/atom", format: "atom" },
  minIntervalSeconds: 900,
  severity: "informational",

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a feed that itself fails says nothing about Slack.
    if (!feed) return { state: "unknown", message: "no feed supplied" };
    if (feed.error) return { state: "unknown", message: feed.error };
    if (feed.entries.length === 0) {
      return { state: "ok", message: "no entries in the status feed", ttlSeconds: 900 };
    }

    // DC2: the full folded history, independent of the 7-day window `message`
    // below still narrates — that window is a summary for a human glance, not
    // a limit on what actually happened.
    const timeline: HealthTimelineEntry[] = feed.latest.map((e) => ({
      id: e.id,
      title: stripTitlePrefix(e.title),
      state: isIncident(e.title) ? "degraded" : "ok",
      updatedAt: e.publishedAt,
      link: e.link,
      // resolvedAt intentionally never set — see the module docstring's
      // ban on inferring resolution from entry.summary/entry.summaryHtml prose.
    }));

    // `latest` folds successive updates to one incident down to its newest.
    // Slack's feed is history, so most entries are long closed.
    const cutoff = Date.now() - WINDOW_MS;
    const recent = feed.latest
      .filter((e) => isIncident(e.title))
      .filter((e) => (e.publishedAt ? Date.parse(e.publishedAt) : 0) >= cutoff);

    if (recent.length === 0) {
      return {
        state: "ok",
        message: "no incidents published in the last 7 days",
        ttlSeconds: 900,
        timeline,
      };
    }

    // `ok` with a message, not `degraded`: every one of these is history, and
    // anything still running is `service`'s to report from the live API.
    return {
      state: "ok",
      message: `${recent.length} incident${recent.length === 1 ? "" : "s"} in the last 7 days: ${
        recent.map((e) => e.title.replace(/^\s*incident:\s*/i, "")).join("; ")
      }`,
      ttlSeconds: 900,
      timeline,
    };
  },
};

export default incidents;
