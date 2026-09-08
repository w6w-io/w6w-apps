/**
 * Is Nutshell's application (which serves the JSON-RPC API) up?
 *
 * ## Verified, not assumed — checked three ways on 2026-09-06
 *
 * Nutshell publishes at **`status.nutshell.com`**, which is `status.nutshell.com`
 * resolving through to an Atlassian Statuspage instance.
 *
 * **(a) It self-identifies as Nutshell's own page.** `GET
 * /api/v2/status.json` returns `"page": {"id": "2qwvjdg4xvkv", "name":
 * "Nutshell", "url": "https://status.nutshell.com"}` — the vendor's own name
 * and a matching host, not a redirect target or a generic landing page.
 *
 * **(b) A bogus sibling path is refused, not caught by a catch-all.**
 * `GET /api/v2/definitely-not-real-zzz.json` answers `404` with a `0`-byte
 * body — this is a real Statuspage deployment's routing, not a static site
 * that 200s everything.
 *
 * **(c) One specific component covers the API, and most of the page does
 * not.** The 12 components on this page are mostly unrelated to the JSON-RPC
 * API this app calls — "Nutshell Marketing outgoing email", "Google Apps
 * mail integration", "Business card scanner", "Nutshell Support Chat", and
 * so on. Exactly one, **"Nutshell application"** (id `5q688w26m371`), covers
 * `app.nutshell.com` — the same host that serves this app's JSON-RPC
 * endpoint (`/api/v1/json`). Reporting the page-wide indicator instead would
 * mean an outage in the support chat widget or the marketing email sender
 * shows up here as "Nutshell is down", which it is not.
 *
 * ## Why the raw component API rather than a declared `feed`
 *
 * Statuspage exposes both an Atom/RSS incident feed and a small JSON API
 * (`/api/v2/*.json`); this app reads `components.json` directly instead of
 * declaring a `feed`, because a feed only carries incident *history* (past
 * updates), while the JSON API's `components[].status` is the vendor's own
 * CURRENT state for exactly the component this check cares about — no
 * folding of "is the newest entry about a still-open incident" required.
 *
 * `credential: "none"` and `scope: "app"` are the `kind: "service"` defaults,
 * stated explicitly because they are the precondition for `network` below —
 * a status host must never see a Nutshell API key.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const COMPONENTS_URL = "https://status.nutshell.com/api/v2/components.json";

/** The one component that covers `app.nutshell.com` — verified 2026-09-06. */
export const APPLICATION_COMPONENT_ID = "5q688w26m371";
export const APPLICATION_COMPONENT_NAME = "Nutshell application";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface ComponentsResponse {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(
  status: string | undefined,
): "ok" | "degraded" | "down" | "unknown" {
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
  title: "Nutshell application status",
  description: `Reads the "${APPLICATION_COMPONENT_NAME}" component from status.nutshell.com — ` +
    "the component covering app.nutshell.com, which also serves this app's JSON-RPC endpoint. " +
    "Other components on that page (marketing email, business card scanner, support chat) are " +
    "unrelated to the API and are not reported here.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.nutshell.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Nutshell itself.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as ComponentsResponse | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.nutshell\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Nutshell's" };
    }

    const component = (body.components ?? []).find((c) => c.id === APPLICATION_COMPONENT_ID);
    if (!component) {
      return {
        state: "unknown",
        message: `Status page no longer lists "${APPLICATION_COMPONENT_NAME}"`,
      };
    }

    const state = mapComponentStatus(component.status);
    return {
      state,
      message: state === "ok" ? undefined : `${component.name}: ${component.status}`,
      components: { [APPLICATION_COMPONENT_ID]: { state, message: component.name } },
      ttlSeconds: 60,
    };
  },
};

export default service;
