/**
 * Is Lemon Squeezy up?
 *
 * ## The status page, and how it was found
 *
 * `status.lemonsqueezy.com` answers 200 with a real page — title
 * "No problems detected. | Lemon Squeezy Status" — but it is neither
 * Statuspage nor Instatus: none of the usual `/api/v2/summary.json`,
 * `/history.atom` or `/index.json` paths resolve (all 404, with a small
 * uniform "Not a status page route" Varnish error body, confirmed 2026-09-05).
 * The page is built on **Oh Dear** (`ohdear.app`) — its own favicon and footer
 * link to `ohdear.app/status-page/lemon-squeezy-status/subscribe-rss` name it
 * — and Oh Dear status pages publish a plain RSS incident feed at `/rss`,
 * confirmed live:
 *
 *     GET https://status.lemonsqueezy.com/rss  ->  200, application/rss+xml
 *
 * `lemonsqueezy.statuspage.io/api/v2/summary.json` was checked too, as the
 * obvious guess: it 302-redirects to `statuspage.io`'s own marketing root,
 * the standard signature of an unclaimed page, so it is not the real one.
 *
 * ## Declared as a feed, not hand-parsed
 *
 * Per `core/docs/build-a-w6w-app.md` ("Declare a status feed; don't parse
 * one"), this uses `feed: { url }` so the host fetches and parses the RSS —
 * this hook only interprets what an entry means. At the time of writing the
 * feed carries zero `<item>`s (nothing has ever been posted to it, matching
 * the page's own "No problems detected" state), so the *shape* of an open
 * item's title could not be observed on the wire. That is stated here rather
 * than guessed: this check treats the mere PRESENCE of an unresolved-looking
 * entry as the open-incident signal (title not containing a resolved/complete
 * marker), the same convention `apps/ghost`'s incident.io feed uses — the
 * safest generic reading when the vendor's own resolved-marker convention is
 * unverifiable from an always-empty feed.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Lemon Squeezy is
 * SaaS-only — there is no self-hosted deployment — so every Connection this
 * app can hold runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for widening `network` below — a
 * third-party status host must never see an API key.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const STATUS_FEED_URL = "https://status.lemonsqueezy.com/rss";

/**
 * Whether a feed entry's title reads as still-open.
 *
 * Exported so the reading rule is testable without a live feed. Matches the
 * same resolved/complete/operational vocabulary `apps/ghost` uses for its
 * incident.io feed — the closest verifiable precedent, since Lemon Squeezy's
 * own feed has never carried a real incident to observe.
 */
export function isOpenIncident(title: string): boolean {
  return !/resolved|complete|operational|maintenance complete/i.test(title);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Lemon Squeezy platform status",
  description:
    "Reads status.lemonsqueezy.com's Oh Dear-powered RSS feed for open incidents. The feed has " +
    "carried no items since this app was built, so the open/resolved title convention is a best " +
    "reading rather than a confirmed one — see the module docs.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  feed: { url: STATUS_FEED_URL },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => isOpenIncident(e.title));
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
