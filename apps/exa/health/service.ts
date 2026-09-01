/**
 * Is Exa up?
 *
 * `status.exa.ai` is a **custom** status page (Vercel-hosted Next.js app, per
 * its response headers — not Atlassian Statuspage, Instatus, or Better
 * Stack). Verified 2026-09-01, three ways:
 *
 * 1. `GET /api/v2/summary.json` → `{"page":{"name":"Exa","url":"https://status.exa.ai",
 *    "status":"UP"}}` — real JSON, self-identifies as Exa, but carries no
 *    component detail and only one observed status value.
 * 2. `GET /api/v2/components.json` → a real, richer component tree naming
 *    Exa's own products: `Search API` (parent, with `People` and `Default`
 *    children), `Websets`, `Exa MCP`. This is what `check` below reads.
 * 3. Every other conventional path is a genuine 404 (a Next.js not-found
 *    page, not a decoy 200): `/api/v2/incidents.json`, `/history.rss`,
 *    `/feed`. There is no incident history or Atom/RSS feed to declare via
 *    `feed:` — only the two `/api/v2/*.json` endpoints above exist.
 *
 * Because there is no documented status vocabulary beyond the single
 * `OPERATIONAL` value observed live, any status string this check has not
 * seen is treated as `degraded` rather than guessed as `down` — the same
 * "never invent a worse verdict than the evidence supports" discipline
 * `mapComponentStatus` below encodes explicitly.
 *
 * `credential: "none"` (the default for `kind: "service"`) is stated
 * explicitly: a status host must never see an Exa API key, which is also why
 * this host is declared only in this check's own `network`, not the app's
 * `w6w.network.allow`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const COMPONENTS_URL = "https://status.exa.ai/api/v2/components.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  isParent?: boolean;
  children?: StatusComponent[];
}

interface ComponentsBody {
  components?: StatusComponent[];
}

/** Only `OPERATIONAL` has been observed live; anything else is treated as `degraded`, not guessed. */
export function mapComponentStatus(status: string | undefined): HealthState {
  if (!status) return "unknown";
  return status.toUpperCase() === "OPERATIONAL" ? "ok" : "degraded";
}

/** Flatten the (at most one level deep, observed live) parent/child tree into leaves. */
function flatten(components: StatusComponent[]): StatusComponent[] {
  const leaves: StatusComponent[] = [];
  for (const c of components) {
    if (c.children && c.children.length > 0) {
      leaves.push(...flatten(c.children));
    } else {
      leaves.push(c);
    }
  }
  return leaves;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Exa platform status",
  description:
    "Component status from status.exa.ai's components.json: Search API (People, Default), " +
    "Websets, Exa MCP.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.exa.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Exa itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as ComponentsBody | null;
    const leaves = flatten(body?.components ?? []).filter((c) => c.name);
    if (leaves.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    leaves.forEach((leaf, index) => {
      const state = mapComponentStatus(leaf.status);
      const key = leaf.id ?? `component-${index}`;
      components[key] = state === "ok"
        ? { state, message: leaf.name }
        : { state, message: `${leaf.name}: ${leaf.status ?? "unknown"}` };
    });

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = leaves.filter((leaf) => mapComponentStatus(leaf.status) !== "ok");

    return {
      state,
      message: affected.length > 0
        ? `affected: ${affected.map((c) => `${c.name} (${c.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
