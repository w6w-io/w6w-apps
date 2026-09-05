/**
 * Is Tumblr up?
 *
 * ## `status.tumblr.com` is a decoy — checked live on 2026-09-05
 *
 * The obvious guess, `https://status.tumblr.com`, answers `200` — but its body
 * is an ordinary Tumblr blog theme carrying a **login-phishing warning**
 * banner ("Warning: Never enter your Tumblr password unless
 * https://www.tumblr.com/login is the address..."), not a status dashboard.
 * It is someone's actual Tumblr blog squatting on that subdomain, exactly the
 * "HTTP 200 ≠ a real endpoint" trap this pack watches for elsewhere.
 * `https://status.tumblr.com/api/v2/summary.json` (the shape a Statuspage.io
 * host would answer at) 404s, confirming it.
 *
 * ## The real page: `automatticstatus.com`
 *
 * Tumblr's parent, Automattic, runs ONE shared status page for its whole
 * portfolio (WordPress.com, Jetpack, Gravatar, Akismet, Tumblr, and ~20 more)
 * at **`https://automatticstatus.com`** — verified live to actually name
 * Tumblr, not just claim to: it monitors three Tumblr components
 * individually — `Tumblr API`, `Tumblr Dashboard`, `Tumblr Sites` — among its
 * ~34 total. A page that covered only WordPress.com would say nothing about
 * this app; this one explicitly does.
 *
 * It is Zoho Site24x7's "StatusIQ" product, not Statuspage.io — a different
 * vendor with a different machine-readable shape.
 * `automatticstatus.com/api/v2/summary.json` (the Statuspage.io shape) 404s;
 * the real machine-readable surface is an **RSS feed at
 * `https://automatticstatus.com/rss`** (found in the page's own embedded
 * config: `statuspages.globals.rssurl = spUrl + "/rss"`).
 *
 * ## The feed shape is a live snapshot, not an incident log — and that is
 * exactly why declaring it as `feed` still works
 *
 * Most status feeds emit one entry per incident UPDATE (`rfcs/healthcheck.md`
 * — the reason `latestPerId` exists at all: Mistral's feed has 50 entries
 * describing 26 incidents). This one is structurally different: it has
 * exactly ONE item per monitored COMPONENT, titled `"{component} -
 * {status}"` (e.g. `"Tumblr API - Operational"`), whose `pubDate` is that
 * component's last status change — so the newest entry per component IS its
 * current status, not a stale incident title. Since each component's `<guid>`
 * is already unique (one entry per component, not per update), the host's
 * `latestPerId` fold is a no-op here rather than a correctness fix — but
 * declaring `feed` instead of hand-fetching still buys the generic Atom/RSS
 * parsing, so this file only has to interpret entries, never scan XML.
 *
 * Status vocabulary (from the page's own embedded
 * `incident_status_id_list` config, not guessed): `OPERATIONAL`,
 * `DEGRADED_PERFORMANCE`, `PARTIAL_OUTAGE`, `MAJOR_OUTAGE`,
 * `UNDER_MAINTENANCE`, `INFORMATIONAL` — rendered in the feed's own entry
 * titles as human text ("Operational", "Degraded Performance", …), which is
 * what `mapComponentStatus` below matches against.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Tumblr is SaaS-only —
 * there is no self-hosted Tumblr — so an incident on any of its three
 * components is evidence about every Connection this app can hold.
 * `credential: "none"` is the default and is stated explicitly, since it is
 * the precondition for a feed host to be reachable at all — this status page
 * must never see a Tumblr OAuth token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const FEED_URL = "https://automatticstatus.com/rss";

/** Only these three components are Tumblr's own; automatticstatus.com covers ~30 more. */
const TUMBLR_COMPONENT_PREFIX = "Tumblr ";

/** `"{component} - {status}"` — the vendor's own RSS entry title shape. */
export function parseComponentTitle(title: string): { name: string; status: string } | undefined {
  const idx = title.lastIndexOf(" - ");
  if (idx === -1) return undefined;
  return { name: title.slice(0, idx).trim(), status: title.slice(idx + 3).trim() };
}

/** Site24x7 StatusIQ's status vocabulary, rendered as the human text this page's titles use. */
export function mapComponentStatus(status: string): HealthState {
  switch (status.toLowerCase()) {
    case "operational":
    case "informational":
      return "ok";
    case "degraded performance":
    case "under maintenance":
      return "degraded";
    case "partial outage":
    case "major outage":
      return "down";
    default:
      return "unknown";
  }
}

/** A stable per-component key: slugify the vendor's own component name. */
export function componentKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Automattic platform status (Tumblr components)",
  description:
    "Reads the three Tumblr-specific components (API, Dashboard, Sites) from Automattic's " +
    "shared status page at automatticstatus.com, which also covers WordPress.com, Jetpack and " +
    "~30 other products.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  feed: { url: FEED_URL },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    if (!feed || feed.latest.length === 0) {
      return { state: "unknown", message: "Status feed returned no entries" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const entry of feed.latest) {
      if (!entry.title.startsWith(TUMBLR_COMPONENT_PREFIX)) continue;
      const parsed = parseComponentTitle(entry.title);
      if (!parsed) continue;
      const state = mapComponentStatus(parsed.status);
      components[componentKey(parsed.name)] = state === "ok"
        ? { state, message: parsed.name }
        : { state, message: `${parsed.name}: ${parsed.status}` };
    }

    if (Object.keys(components).length === 0) {
      // The feed answered, but none of its entries named a Tumblr component —
      // e.g. Automattic reorganised the page. Say so rather than reporting a
      // false "ok" from an empty component set.
      return { state: "unknown", message: "Status feed no longer names any Tumblr component" };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = Object.values(components).filter((c) => c.state !== "ok");

    return {
      state,
      message: affected.length > 0 ? affected.map((c) => c.message).join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
