import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is Wati's shared platform up? — `status.wati.io`, a real, live Zoho StatusIQ (Site24x7) page
 * confirmed 2026-09-05 (page title "StatusIQ", assets served from
 * `img-wc.site24x7static.com/site24x7/client/14387286/statuspage/...`). It publishes 10
 * components including one literally named "Wati API", which this check reads.
 *
 * ## Why this is a hand-rolled fetch, not a declared `feed:`
 *
 * StatusIQ serves a real RSS document at `https://status.wati.io/rss` — but its `<guid>` is NOT
 * a per-component identity: it is `base64(pubDate)`, IDENTICAL across every component published
 * in the same status-update batch. Confirmed live: fetching that feed on 2026-09-05 showed one
 * batch of 10 items — Analytics, Automations, Billing, Campaign, Contacts, Login, Onboarding,
 * Team Inbox, Wati API, Webhook, all "Operational" — sharing the exact same `<guid>` (and no
 * `<link>` of their own to disambiguate by). The host's generic feed-backed check support folds
 * a status feed to one entry per `id` (`latestPerId`, matching this RFC's own "a feed is a log
 * of updates" rule) — declaring `feed:` here would collapse 9 of the page's 10 components onto
 * whichever one happens to be processed first for a shared guid, silently dropping the rest,
 * including possibly "Wati API" itself. This is a per-vendor defect this app must work around,
 * not a case the generic feed reader could handle: nothing in the RSS 2.0 spec requires a
 * unique guid, so an `id`-keyed fold can never be made safe against a publisher that reuses one.
 *
 * So this check fetches the feed itself and groups entries by TITLE ("<Component> - <Status>")
 * instead of by guid, taking the newest-by-pubDate entry whose title starts with "Wati API".
 * Every status word seen live so far is "Operational" (StatusIQ's default; no incident has been
 * recorded on this young page) — the word→state mapping below also covers StatusIQ's other
 * documented indicator words defensively, since a page that has never gone down could still do so.
 */
const STATUS_WORD_STATE: Array<{ pattern: RegExp; state: HealthState }> = [
  { pattern: /operational/i, state: "ok" },
  { pattern: /under maintenance/i, state: "ok" },
  { pattern: /degraded/i, state: "degraded" },
  { pattern: /partial outage/i, state: "degraded" },
  { pattern: /major outage|service disruption|down/i, state: "down" },
];

function stateForStatusWord(word: string): HealthState {
  for (const { pattern, state } of STATUS_WORD_STATE) {
    if (pattern.test(word)) return state;
  }
  return "unknown";
}

interface FeedItem {
  title: string;
  pubDateMs: number;
}

/** Minimal RSS `<item><title>`/`<pubDate>` scan — see the module doc for why this bypasses the
 * host's generic `feed:` mechanism instead of reusing it. */
function parseWatiStatusItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const title = /<title>([\s\S]*?)<\/title>/i.exec(block)?.[1]?.trim();
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1]?.trim();
    if (!title) continue;
    const pubDateMs = pubDate ? Date.parse(pubDate) : NaN;
    items.push({ title, pubDateMs: Number.isNaN(pubDateMs) ? -Infinity : pubDateMs });
  }
  return items;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Wati platform status",
  description: 'The "Wati API" component off status.wati.io\'s own RSS feed — read directly ' +
    "rather than via the host's generic feed reader, because this feed's <guid> collides across " +
    "unrelated components (see module doc).",
  kind: "service",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch("https://status.wati.io/rss", {
        headers: { accept: "application/rss+xml, application/xml, text/xml" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach status.wati.io: ${String(err)}` };
    }
    if (!res.ok) {
      return { state: "unknown", message: `status.wati.io returned ${res.status}` };
    }

    const xml = await res.text();
    const items = parseWatiStatusItems(xml);
    if (items.length === 0) {
      return { state: "unknown", message: "status.wati.io's RSS feed carried no items" };
    }

    const apiItems = items.filter((i) => i.title.startsWith("Wati API"));
    if (apiItems.length === 0) {
      return {
        state: "unknown",
        message: 'status.wati.io no longer publishes a "Wati API" component',
      };
    }
    apiItems.sort((a, b) => b.pubDateMs - a.pubDateMs);
    const latest = apiItems[0];
    const word = latest.title.replace(/^Wati API\s*-\s*/i, "").trim();
    return { state: stateForStatusWord(word), message: latest.title };
  },
};

export default service;
