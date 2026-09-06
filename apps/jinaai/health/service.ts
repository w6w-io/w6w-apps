/**
 * Is Jina AI's Search Foundation API up?
 *
 * ## The status page is real, checked three ways on 2026-09-06
 *
 * Jina AI publishes at **`status.jina.ai`**, an Atlassian Statuspage —
 * `jina.statuspage.io/api/v2/summary.json` 302-redirects there, which is the
 * page's own canonical-claim signal.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * (6,270 B) and `/api/v2/status.json` (210 B) answer two different, correctly
 * shaped documents; a `/api/v2/status.json` on an unclaimed page would not
 * exist at all.
 *
 * **(b) Content-type and body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema.
 *
 * **(c) Does the page describe THIS product?** Yes: `page.id: "nldp3ndmy0vf"`,
 * `page.name: "Jina AI"`, and its components are genuinely Jina's own models
 * and products — `jina-embeddings-v5-text-small`, `jina-reranker-v2-base-multilingual`,
 * `r.jina.ai`, `s.jina.ai`, `jina-vlm` — grouped as "Embedding Models",
 * "Reranker Models" and "Reader".
 *
 * ## Scoped to what this app actually calls
 *
 * The page also names `r.jina.ai` and `s.jina.ai` — Jina's separate Reader and
 * Search products, on their own hosts, which this app does NOT implement (see
 * `lib/client.ts`). Reporting their status here would tie this App's health to
 * products it has no Action for. This check keeps only the "Embedding Models"
 * and "Reranker Models" groups, plus the standalone `jina-vlm` component
 * (used by the `chat-completions` action), and drops everything else.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Jina AI is SaaS-only
 * for this API — there is no self-hosted `api.jina.ai` — so an incident here
 * is evidence about every Connection.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.jina.ai/api/v2/summary.json";

/** Component names this app's Actions actually cover. Reader/Search components are excluded. */
export const COVERED_GROUPS = new Set(["Embedding Models", "Reranker Models"]);
export const COVERED_STANDALONE = new Set(["jina-vlm"]);

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

function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Jina AI platform status",
  description: "Component status from status.jina.ai, scoped to the Embedding Models and " +
    "Reranker Models groups plus jina-vlm — the products this app's actions actually cover.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.jina.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.jina\.ai(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Jina AI's" };
    }

    // Build the group id -> name map so components can be filtered by group name.
    const groupNames: Record<string, string> = {};
    for (const c of body.components ?? []) {
      if (c.group && c.id && c.name) groupNames[c.id] = c.name;
    }

    const nodes = (body.components ?? []).filter((c) => {
      if (!c?.name || c.group === true) return false;
      const groupName = c.group_id ? groupNames[c.group_id] : undefined;
      return (groupName && COVERED_GROUPS.has(groupName)) || COVERED_STANDALONE.has(c.name);
    });
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no covered components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
