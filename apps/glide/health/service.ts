/**
 * Is Glide up?
 *
 * ## `status.glideapps.com` is real, self-identified, and not Statuspage-shaped
 *
 * Verified live 2026-09-06:
 *
 * ```
 * GET https://status.glideapps.com/api/v2/summary.json  -> 404 "Page not found" (plain text)
 * GET https://status.glideapps.com/index.json            -> 404 "Page not found"
 * GET https://status.glideapps.com/history.atom          -> 200, real Atom feed
 * ```
 *
 * So this is neither an Atlassian Statuspage nor an Instatus/Better-Stack page — the
 * `/api/v2/*` and `/index.json` conventions those platforms share both 404 outright here, which
 * rules out a catch-all decoy. What Glide actually publishes is a plain Atom history feed, and it
 * self-identifies unambiguously:
 *
 * ```xml
 * <title>Glide Apps Status - Incident History</title>
 * <author><name>Glide</name></author>
 * ```
 *
 * A real incident observed the same day named exactly the surface this app covers:
 *
 * ```
 * "Glide Classic increased error rate" — Major incident, components:
 * Apps, General, Data, Glide Tables, Builder, General
 * ```
 *
 * ("Glide Classic" is the vendor's own name for the API this app calls — `docs/classic-api/*`.)
 *
 * ## No component-level JSON — this is a page-level feed
 *
 * Unlike a Statuspage `/summary.json`, there is no separate per-component status document, so this
 * check cannot say "Big Tables is down but the builder is fine" — every incident on the page rolls
 * into one verdict, per `covers: ["*"]`.
 *
 * ## Reading "is this incident still open" without a `resolved` field
 *
 * The feed carries one Atom `<entry>` per incident, with every update to that incident
 * concatenated inside `<content>`, **newest update first**. There is no structured "resolved"
 * flag in what the host's generic feed parser exposes (`HealthFeedEntry.summary` is plain text),
 * so this check reads the *first* recognised status word in that text — the newest status, because
 * of the ordering above. The one incident observed while building this app reads (HTML stripped):
 *
 * ```
 * Major incident - Apps, General, Data, Glide Tables, Builder, General
 * September 1, 2026 · 15:56 UTC
 * Resolved
 * The data provider incident has resolved and all Glide systems are operational.
 * September 1, 2026 · 15:20 UTC
 * Issue
 * We are seeing an increased level of errors and latency …
 * ```
 *
 * "Resolved" is the first status word, so this incident reads closed. "Issue" is Glide's own word
 * for a freshly-opened incident (the only other status word this app has actually observed) — the
 * usual "Investigating"/"Identified"/"Monitoring" vocabulary other vendors use is included
 * defensively in case Glide's own escalation flow uses it too, but is **unverified** against a live
 * incident. An update whose text names none of them is reported `unknown` rather than guessed
 * either way, same discipline `HealthState.unknown` is for everywhere else.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Glide is SaaS-only — there is no
 * self-hosted Glide — so an incident here is evidence about every Connection this app can hold.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_FEED_URL = "https://status.glideapps.com/history.atom";

/**
 * Status words this app has seen or expects, newest-first meaning "resolved" is checked for but
 * every other word is treated the same (open). Only "Resolved" and "Issue" have been observed live
 * (2026-09-06); the rest are the common status-page vocabulary, included defensively.
 */
const RESOLVED_WORD = "resolved";
const KNOWN_STATUS_WORDS = [
  "resolved",
  "monitoring",
  "identified",
  "investigating",
  "issue",
] as const;

/**
 * The earliest (i.e. newest, given the feed's newest-update-first ordering) recognised status word
 * in an entry's plain-text summary, or `undefined` when none is recognised.
 */
export function currentStatusWord(summary: string): string | undefined {
  const lower = summary.toLowerCase();
  let bestIndex = Infinity;
  let bestWord: string | undefined;
  for (const word of KNOWN_STATUS_WORDS) {
    const idx = lower.indexOf(word);
    if (idx !== -1 && idx < bestIndex) {
      bestIndex = idx;
      bestWord = word;
    }
  }
  return bestWord;
}

/** `Major incident` -> down, `Minor incident` / anything else open -> degraded. */
export function severityFromTitle(summary: string): HealthState {
  const m = /^(major|minor)\s+(incident|maintenance)/i.exec(summary.trim());
  if (m && /major/i.test(m[1])) return "down";
  return "degraded";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Glide platform status",
  description: "Reads status.glideapps.com's Atom incident-history feed for open incidents.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  feed: { url: STATUS_FEED_URL },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error, ttlSeconds: 300 };

    const entries = feed?.latest ?? [];
    const states: HealthState[] = [];
    const notes: string[] = [];

    for (const entry of entries) {
      const word = currentStatusWord(entry.summary);
      if (word === RESOLVED_WORD) continue; // closed — does not count against the verdict
      if (word === undefined) {
        states.push("unknown");
        notes.push(`${entry.title} (unrecognised status text)`);
        continue;
      }
      states.push(severityFromTitle(entry.summary));
      notes.push(`${entry.title} (${word})`);
    }

    if (states.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: worstHealthState(states),
      message: notes.slice(0, 5).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
