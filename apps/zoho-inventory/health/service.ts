/**
 * Is Zoho Inventory up? — Zoho's StatusIQ (Site24x7) status page.
 *
 * Verified 2026-09-22: `https://us.zohostatus.com/rss` is a Site24x7 StatusIQ
 * page that lists every Zoho product — Mail, CRM, Bigin, Books, Inventory,
 * ~100 more — as one RSS item per component, titled `"{component} -
 * {status}"`. Fetched live: the entry is exactly `"Zoho Inventory -
 * Operational"`, distinct from the `"Zoho Books"` and `"Zoho CRM"` entries on
 * the same feed. This is the same feed this pack's `zohobooks`, `zoho` (Zoho
 * CRM) and `zohomail` apps already document.
 *
 * Annotation, and why each axis is what it is:
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:oauth2-<region>` checks) or "is there quota left"
 *     (`quota`, declared unavailable in `health/quota.ts`).
 *   - `scope: "app"` (default for this kind) — the answer is the same
 *     regardless of which data centre a Connection lives in; Zoho publishes
 *     one status page across all of them.
 *   - `credential: "none"` (also the default) — reports even before anyone
 *     has connected.
 *   - `feed`, not a hand-parsed fetch: the host fetches and parses the RSS;
 *     this hook only finds the "Zoho Inventory" component and reads its status
 *     word off the title — StatusIQ has no separate structured status field.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** StatusIQ's component status vocabulary. */
const STATUS: Record<string, HealthState> = {
  "operational": "ok",
  "under maintenance": "degraded",
  "degraded performance": "degraded",
  "partial outage": "degraded",
  "major outage": "down",
};

/** Exact component name on the status page — "Zoho Inventory". */
const COMPONENT = "Zoho Inventory";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Zoho Inventory platform status",
  description:
    'Reads the "Zoho Inventory" component off Zoho\'s StatusIQ RSS feed (us.zohostatus.com/rss). ' +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://us.zohostatus.com/rss" },
  minIntervalSeconds: 300,

  check({ feed }) {
    // `unknown`, never `down`: a feed that itself fails to fetch/parse tells
    // us nothing about the vendor, and reporting that as an outage would lie.
    if (feed?.error) return { state: "unknown", message: feed.error };

    const entry = (feed?.latest ?? []).find((e) => {
      const [name] = e.title.split(" - ");
      return name.trim() === COMPONENT;
    });
    if (!entry) {
      return {
        state: "unknown",
        message: `feed carried no "${COMPONENT}" component — StatusIQ may have renamed it`,
      };
    }

    const status = entry.title.slice(entry.title.indexOf(" - ") + 3).trim().toLowerCase();
    return {
      state: STATUS[status] ?? "unknown",
      message: entry.title,
      ttlSeconds: 300,
    };
  },
};

export default service;
