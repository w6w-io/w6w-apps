/**
 * Is Gorgias up? — status.gorgias.com, an Atlassian Statuspage-powered page.
 *
 * Verified live 2026-08-29: `https://status.gorgias.com/api/v2/status.json`
 * returns a structured `{"status":{"indicator":"none","description":"All
 * Systems Operational"}}`, and `https://status.gorgias.com/history.atom` is a
 * real, currently-maintained Atom feed (25 entries, most recent dated
 * 2026-08-27). The Atom feed is used rather than the JSON summary because the
 * spec's `feed` mechanism is host-parsed generic Atom/RSS — one fewer
 * hand-rolled parser for this app to get subtly wrong.
 *
 * Gorgias's Statuspage instance puts every update for one incident inside a
 * SINGLE `<entry>`'s `<content>`, newest update first, rather than one entry
 * per update — unlike the "one entry per update" shape `rfcs/healthcheck.md`
 * warns about elsewhere in this pack (Mistral, BambooHR). `latest` is still
 * used for the fold that convention establishes, and the same word-boundary
 * regex those apps use against the whole `summary` is used here too, since a
 * `resolved` marker anywhere in the concatenated update history — not just
 * the newest line — is the same signal.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const RESOLVED = /\b(resolved|completed|monitoring)\b/i;

const service: HealthCheckDefinition = {
  key: "service",
  title: "Gorgias platform status",
  description:
    "Open incidents on status.gorgias.com's Atom history feed. Unauthenticated and unsigned; fetched and parsed by the host.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.gorgias.com/history.atom" },
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
