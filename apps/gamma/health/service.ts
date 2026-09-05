/**
 * Is Gamma up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * Gamma publishes at **`status.gamma.app`**, an Instatus-hosted page.
 *
 * **(a) It self-identifies.** `https://status.gamma.app/summary.json` answers
 * `200` with `{"page":{"name":"Gamma App","url":"https://status.gamma.app",
 * "status":"UP"}}` — the product name, not a generic template.
 *
 * **(b) Its incident history names Gamma's own components.** The Atom feed
 * (`history.atom`, 32,136 bytes) carries real incidents whose
 * "Affected Components" line lists `Web Application, Multiplayer, AI, API` —
 * this app's own surface is the fourth of those.
 *
 * **(c) It is not a redirect decoy.** `gammaapp.statuspage.io` (the vendor's
 * old Atlassian Statuspage slug) 302s to `statuspage.io`'s own marketing page,
 * confirming that page is abandoned — `status.gamma.app` (Instatus) is the
 * live one, not the other way around.
 *
 * ## Why a feed, not `summary.json`
 *
 * `summary.json` is undocumented, minimal (76 bytes), and its `status` enum is
 * unverified beyond the single `"UP"` value observed live — mapping an unseen
 * value would be a guess. The Atom feed is Instatus's own structured incident
 * log and is the shape `build-a-w6w-app.md` names explicitly ("declare a
 * status feed; don't parse one"), so the host does the generic Atom parsing
 * and this file only interprets Gamma's vocabulary.
 *
 * Atom is preferred over the RSS sibling per the host's own guidance — `rss`
 * redirects to `history.rss`, whose `<pubDate>` doesn't distinguish "opened"
 * from "last updated"; Atom's `<updated>` at least names the right field, even
 * though (see below) this vendor doesn't populate it usefully either.
 *
 * ## Reading an Instatus entry
 *
 * Unlike Statuspage.io/Mistral (one feed entry per UPDATE), an Instatus entry
 * already accumulates an incident's full history in one description: each
 * status change appends a new `"<Date> - <Status> - <message>"` line to the
 * SAME entry, so `latest` (folded by id) already gives one row per incident.
 * The terminal status is therefore the LAST such line in the entry's plain-text
 * `summary` — this is the same "read the vendor's own status token instead of
 * guessing from prose" discipline `healthcheck.md` asks for; it just has to be
 * extracted positionally because Instatus doesn't prefix the whole body with
 * one banner status the way Mistral does.
 *
 * `<updated>` is NOT used to gauge staleness: it was observed equal to
 * `<published>` on a resolved 53-minute incident, so Instatus does not bump it
 * on later appends.
 */
import type { HealthCheckDefinition, HealthFeedEntry } from "@w6w/types";

export const FEED_URL = "https://status.gamma.app/history.atom";

/** Instatus's own status vocabulary, observed in the feed body. */
const STATUS_TOKENS = ["Investigating", "Identified", "Monitoring", "Update", "Resolved"];
const STATUS_LINE = new RegExp(`-\\s*(${STATUS_TOKENS.join("|")})\\s*-`, "gi");

/**
 * The most recent status token appended to an entry's body, or `undefined`
 * when the entry carries none of Instatus's known tokens (a format this app
 * hasn't seen — treated as "can't tell", not as "resolved").
 */
export function latestStatusToken(entry: HealthFeedEntry): string | undefined {
  const matches = [...entry.summary.matchAll(STATUS_LINE)];
  if (matches.length === 0) return undefined;
  return matches[matches.length - 1][1];
}

export function isResolved(entry: HealthFeedEntry): boolean {
  return (latestStatusToken(entry) ?? "").toLowerCase() === "resolved";
}

/** The `"Affected Components: a, b, c"` line, when the entry states one. */
export function affectedComponents(entry: HealthFeedEntry): string[] {
  const match = /Affected Components:\s*([^\n]+)/i.exec(entry.summary);
  if (!match) return [];
  return match[1].split(",").map((s) => s.trim()).filter(Boolean);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Gamma platform status",
  description:
    "Incident history from status.gamma.app (Instatus). An incident is 'open' until its own " +
    "latest status line reads Resolved; unrecognised entries are treated as open rather than " +
    "guessed at.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  feed: { url: FEED_URL, format: "atom" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    if (!feed) return { state: "unknown", message: "no feed data supplied" };
    if (feed.error) return { state: "unknown", message: feed.error };

    // No incidents at all in the window is the healthy case.
    if (feed.latest.length === 0) return { state: "ok", ttlSeconds: 60 };

    const open = feed.latest.filter((e) => !isResolved(e));
    if (open.length === 0) return { state: "ok", ttlSeconds: 60 };

    const components = new Set<string>();
    for (const e of open) for (const c of affectedComponents(e)) components.add(c);

    return {
      state: "degraded",
      message: open.map((e) => e.title).join("; ") +
        (components.size > 0 ? ` (affected: ${[...components].join(", ")})` : ""),
      ttlSeconds: 60,
    };
  },
};

export default service;
