/**
 * Is LINE's Messaging API up?
 *
 * ## The status page is real, and it is genuinely per-product
 *
 * LINE publishes at **`api.line-status.info`**, an Atlassian Statuspage instance, found linked
 * from the Messaging API reference itself. Checked three ways on 2026-09-05:
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                    | Status  | Bytes |
 *   | ---------------------------------------- | ------- | ----- |
 *   | `/api/v2/summary.json`                   | 200     | 2,941 |
 *   | `/api/v2/status.json`                    | 200     |   225 |
 *   | `/api/v2/definitely-not-real-zzz.json`   | **404** | **0** |
 *
 * **(b) Does the page describe THIS product?** Yes — `"page": {"name": "LINE API", "url":
 * "https://api.line-status.info"}`.
 *
 * **(c) Is there a component specific to the Messaging API, not just LINE's whole product line?**
 * Yes, and this is the check that matters most: the page carries a **group named "Messaging API"**
 * with two children, `API` and `Webhook`, alongside entirely separate top-level components for
 * `LINE Login`, `LINE Front-end Framework (LIFF)`, `Developers Site` and `Developers Console` — all
 * genuinely different LINE developer products this app has nothing to do with. Scoring the whole
 * page (or its worst component) would report this app degraded because LINE Login is having a bad
 * day; this check reports only the "Messaging API" group's own two children.
 *
 * ## `credential: "none"` is the default for `kind: "service"`
 *
 * Stated explicitly because it is the precondition for the `network` widening below — a status
 * host must never see a channel access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://api.line-status.info/api/v2/summary.json";

/** The vendor's own name for the group this check scopes to. */
export const MESSAGING_API_GROUP_NAME = "Messaging API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "LINE Messaging API status",
  description:
    'Component status from api.line-status.info, scoped to the "Messaging API" group only ' +
    "(its API and Webhook components) — the page also covers LINE Login, LIFF and the Developers " +
    "Console/Site, which this app does not use.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["api.line-status.info"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about LINE — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at someone else's
    // page — the failure mode where a healthy, claimed status page belongs to a different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)api\.line-status\.info(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as LINE's" };
    }

    const all = body.components ?? [];
    const group = all.find((c) => c.group === true && c.name === MESSAGING_API_GROUP_NAME);
    if (!group) {
      return {
        state: "unknown",
        message: `status page no longer publishes a "${MESSAGING_API_GROUP_NAME}" group`,
      };
    }
    const childIds = new Set(
      (group as { components?: string[] }).components ?? [],
    );
    const scoped = all.filter((c) => c.id && childIds.has(c.id));
    if (scoped.length === 0) {
      return { state: "unknown", message: `"${MESSAGING_API_GROUP_NAME}" group has no components` };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of scoped) {
      const state = mapComponentStatus(node.status);
      components[node.id!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = scoped.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes = affected.length > 0
      ? [`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`]
      : [];

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
