/**
 * Is Booqable up? — status.booqable.com, an Atlassian Statuspage-powered page.
 *
 * Verified live 2026-09-06: `https://status.booqable.com/api/v2/summary.json`
 * returns `{"page":{"id":"2l59vzg2v69p","name":"Booqable", ...}}` — a real,
 * currently-maintained Statuspage instance, confirmed by `page.name`, not
 * just the 200. Its component list includes "Web application" (showcase
 * component, i.e. the platform overall — Booqable's API sits behind the same
 * app as its web UI, per `lib/client.ts`'s note that every request is routed
 * through one shared Heroku app), "Search engine", "Payments" (via Stripe),
 * "Email delivery" and "File hosting" — no component named specifically
 * "API", so `covers: ["*"]` reads the whole page rather than one component.
 *
 * `https://status.booqable.com/history.atom` is a real, currently-maintained
 * Atom feed (most recent entry a "Database maintenance" notice). The Atom
 * feed is used rather than the JSON summary because the spec's `feed`
 * mechanism is host-parsed generic Atom/RSS — one fewer hand-rolled parser
 * for this app to get subtly wrong.
 *
 * Booqable's Statuspage instance puts every update for one incident inside a
 * SINGLE `<entry>`'s `<content>`, newest update first, rather than one entry
 * per update (verified against the live feed: the "Database maintenance"
 * entry's content contains "Completed" ... "Verifying" ... "In progress" all
 * in one `<content>` block) — the same shape `apps/gorgias`'s equivalent
 * check documents for its own Statuspage instance. `latest` is still used
 * for the fold that convention establishes, and the same word-boundary regex
 * that app uses against the whole `summary` is used here too, since a
 * "completed"/"resolved" marker anywhere in the concatenated update history
 * — not just the newest line — is the same signal.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const RESOLVED = /\b(resolved|completed|monitoring)\b/i;

const service: HealthCheckDefinition = {
  key: "service",
  title: "Booqable platform status",
  description:
    "Open incidents on status.booqable.com's Atom history feed. Unauthenticated and unsigned; " +
    "fetched and parsed by the host.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.booqable.com/history.atom" },
  minIntervalSeconds: 120,

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a status feed that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }

    const open = feed.latest.filter((e) => !RESOLVED.test(`${e.summary ?? ""} ${e.title ?? ""}`));
    if (open.length === 0) return { state: "ok", ttlSeconds: 120 };

    return {
      state: "degraded",
      message: open.map((e) => e.title).filter(Boolean).join("; "),
      ttlSeconds: 120,
    };
  },
};

export default service;
