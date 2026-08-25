/**
 * Is Streak up?
 *
 * ## The status page is real, checked three ways on 2026-08-25
 *
 * Streak publishes at **`status.streak.com`**, an Atlassian Statuspage
 * (confirmed by following the redirect to `streak.statuspage.io`).
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * answers 200 with 1,778 bytes of JSON; a nonsense path
 * (`/api/v2/definitely-not-real-zzz.json`) answers a genuine **404** with an
 * empty body. An unclaimed `*.statuspage.io` page answers every path with the
 * same ~127,700-byte HTML shell — this is neither that shape nor that size.
 *
 * **(b) Does the page describe THIS product?** Yes —
 * `"page": {"id": "7kv7scdrc87y", "name": "Streak", "url":
 * "https://status.streak.com"}`, with five components: `streak.com`,
 * **`Streak API`**, and the three client apps (`Streak for Gmail (desktop)`,
 * `Streak for Android`, `Streak for iOS`).
 *
 * **(c) Does it name the surface this app actually calls?** Yes, exactly —
 * there is a component literally named `Streak API`, unlike Twitch (six
 * components, none Helix) or Datadog (38 product tiles, nothing matching
 * "api"). No disambiguation is needed here.
 *
 * ## Why the verdict comes from the API component, not the page indicator
 *
 * The page's four other components (`streak.com`, and the three end-user
 * clients) can degrade independently of the API this app calls — a Gmail
 * add-on outage says nothing about whether `api.streak.com` answers. So this
 * check's `state` is the `Streak API` component's own status, not
 * `status.indicator` (which rolls up all five). The other components are
 * still reported, at no worse than `degraded`, so a reader can see "Streak
 * for iOS is down" without this app's own verdict being pulled down by it.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Streak is SaaS-only
 * — there is no self-hosted Streak — so every Connection this app can hold
 * runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Streak API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.streak.com/api/v2/summary.json";

/** The one component this app's own traffic actually travels through. */
export const API_COMPONENT_NAME = "Streak API";
export const API_COMPONENT_ID = "6mgg7krzxhf0";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
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
  title: "Streak platform status",
  description:
    "Component status from status.streak.com, keyed off the 'Streak API' component this app " +
    "actually calls through — the other four components (streak.com, and the Gmail/Android/iOS " +
    "clients) are reported as context, not folded into the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.streak.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Streak — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.streak\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Streak's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const key = node.id ?? node.name!;
      const state = mapComponentStatus(node.status);
      components[key] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const apiComponent = nodes.find((n) =>
      n.id === API_COMPONENT_ID || n.name === API_COMPONENT_NAME
    );
    // If the vendor ever renames or drops the API component, fail open to
    // `unknown` rather than silently reporting on the wrong component.
    const state: HealthState = apiComponent ? mapComponentStatus(apiComponent.status) : "unknown";

    const affected = nodes.filter((n) =>
      n !== apiComponent && mapComponentStatus(n.status) !== "ok"
    );
    const openIncidents = body.incidents?.length ?? 0;

    const notes: string[] = [];
    if (!apiComponent) notes.push("'Streak API' component not found on the status page");
    if (apiComponent && state !== "ok") notes.push(`Streak API: ${apiComponent.status}`);
    if (affected.length > 0) {
      notes.push(`other affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
