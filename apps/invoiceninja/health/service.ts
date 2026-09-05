/**
 * Is Invoice Ninja's own hosted service up? — status.invoiceninja.com.
 *
 * Verified live 2026-09-05: `https://status.invoiceninja.com/` is a real,
 * currently-maintained status page (built on Laravel/Livewire, titled "No
 * problems detected. | Invoice Ninja" at the time of writing) that publishes a
 * genuine RSS 2.0 feed at `https://status.invoiceninja.com/rss` — a real
 * `<rss version="2.0">` document, presently empty (`<channel>` with zero
 * `<item>` entries, i.e. no incidents on record), not a decoy or a sample
 * feed. The spec's `feed` mechanism is host-parsed generic RSS, so this app
 * does not hand-roll a parser for it.
 *
 * This check is deliberately scoped to the **hosted** service at invoicing.co
 * — it says nothing about a self-hosted install's own health, which is what
 * `health/instance.ts` answers per-Connection instead.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const RESOLVED = /\b(resolved|completed|monitoring)\b/i;

const service: HealthCheckDefinition = {
  key: "service",
  title: "Invoice Ninja hosted status",
  description:
    "Open incidents on status.invoiceninja.com's RSS feed. Unauthenticated and unsigned; " +
    "fetched and parsed by the host. Only meaningful for the hosted invoicing.co service — a " +
    "self-hosted install's own health is `instance`.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.invoiceninja.com/rss" },
  minIntervalSeconds: 300,

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a status feed that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }

    const open = feed.latest.filter((e) => !RESOLVED.test(`${e.summary ?? ""} ${e.title ?? ""}`));
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };

    return {
      state: "degraded",
      message: open.map((e) => e.title).filter(Boolean).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
