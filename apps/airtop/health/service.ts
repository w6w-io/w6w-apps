/**
 * Is Airtop up?
 *
 * ## The status page, verified live on 2026-09-01
 *
 * Airtop publishes at **`status.airtop.ai`**, hosted on Instatus (confirmed by
 * `<title>Airtop - Status</title>` and by `airtop.instatus.com` serving the
 * identical page). This is NOT an Atlassian Statuspage instance — Statuspage's
 * usual `/api/v2/summary.json` shape (nested `page`/`status`/`components`) does
 * not exist here; the paths that DO answer real JSON are Instatus's own:
 *
 *   | Path                            | Status | Body                                                              |
 *   | -------------------------------- | ------ | ----------------------------------------------------------------- |
 *   | `/summary.json`                  | 200    | `{"page":{"name":"Airtop","url":"...","status":"UP"}}`            |
 *   | `/components.json`               | 200    | `{"components":[{"id":"...","name":"App","status":"OPERATIONAL"}]}` |
 *   | `/status.json`, `/incidents.json`| 404    | Next.js 404 page (not real endpoints on this host)                |
 *
 * `/api/v2/summary.json` also answers 200, but with the SAME minimal
 * `{page:{name,url,status}}` body as `/summary.json` — it is an alias, not the
 * richer Statuspage-compatible shape some Instatus pages expose elsewhere, so
 * this check uses the plain paths.
 *
 * ## Page status vocabulary — one value confirmed live, two more likely
 *
 * Airtop's page was healthy (`"UP"`) throughout verification, so only that
 * value was observed on the wire. `"HASISSUES"` and `"UNDERMAINTENANCE"` are
 * Instatus's documented page-status values elsewhere (not independently
 * re-verified against Airtop's own page in this session, since it never left
 * `"UP"`) — mapped below, but ANY value this check has not seen reports
 * `unknown` rather than a guess. The same caution applies to `components.json`'s
 * `status` field: only `"OPERATIONAL"` was observed live.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Airtop is SaaS-only —
 * there is no self-hosted Airtop — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.airtop.ai";
export const SUMMARY_URL = `https://${STATUS_HOST}/summary.json`;
export const COMPONENTS_URL = `https://${STATUS_HOST}/components.json`;

interface SummaryBody {
  page?: { name?: string; url?: string; status?: string };
}

interface ComponentsBody {
  components?: Array<{ id?: string; name?: string; status?: string }>;
}

/** Instatus page-level status. See the module doc for what's confirmed vs. inferred. */
export function mapPageStatus(status: string | undefined): HealthState {
  switch (status) {
    case "UP":
      return "ok";
    case "UNDERMAINTENANCE":
      return "degraded";
    case "HASISSUES":
      return "degraded";
    default:
      return "unknown";
  }
}

/** Instatus component-level status. Only `OPERATIONAL` was observed live. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "UNDERMAINTENANCE":
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Airtop platform status",
  description:
    "Page-level status from status.airtop.ai (Instatus), enriched with component detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Airtop — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as SummaryBody | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }

    // Guard against a future redirect silently pointing this probe at someone
    // else's Instatus page.
    if (body.page.name && body.page.name !== "Airtop") {
      return { state: "unknown", message: "status page no longer self-identifies as Airtop's" };
    }

    const state = mapPageStatus(body.page.status);

    // Best-effort component detail — never fatal to the check if it fails.
    let components: Record<string, HealthComponentReport> | undefined;
    let componentNote: string | undefined;
    try {
      const compRes = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
      if (compRes.ok) {
        const compBody = await compRes.json().catch(() => null) as ComponentsBody | null;
        const nodes = (compBody?.components ?? []).filter((c) => c?.id && c?.name);
        if (nodes.length > 0) {
          components = {};
          const affected: string[] = [];
          for (const node of nodes) {
            const compState = mapComponentStatus(node.status);
            components[node.id!] = compState === "ok"
              ? { state: compState, message: node.name }
              : { state: compState, message: `${node.name}: ${node.status}` };
            if (compState !== "ok") affected.push(`${node.name} (${node.status})`);
          }
          if (affected.length > 0) componentNote = `affected: ${affected.join(", ")}`;
        }
      }
    } catch {
      // Component detail is enrichment only; the page-level verdict stands without it.
    }

    return {
      state,
      message: componentNote ?? (body.page.status ? `page status: ${body.page.status}` : undefined),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
