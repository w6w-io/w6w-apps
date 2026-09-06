/**
 * Is folk up? — Instatus at `folk.instatus.com`.
 *
 * Verified live 2026-09-06: two candidate status hosts exist for
 * "folk" — `status.folk.app` (folk's own domain, but CNAMEd to UptimeRobot's
 * public-status-page product with no fetchable JSON summary/component
 * endpoint found) and `folk.instatus.com`. The latter is the one this check
 * uses, because it is independently verifiable as genuinely folk's:
 * `GET https://folk.instatus.com/components.json` answers real components
 * named `"CRM"` ("Manage people, companies, deals, groups and views" — folk's
 * own product description) and `"folk rest API"` — an exact match for the
 * surface this app calls — alongside `"folk website"`, `"Account
 * synchronization"`, `"Messaging"` and `"Data import"`. This is the
 * genuinely-claimed-page pattern (component names and descriptions specific
 * to folk), not the unclaimed-Statuspage-decoy pattern this pack has found
 * elsewhere (a bare redirect to the provider's own marketing page).
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:api-key` check).
 *   - `scope: "app"` (this kind's default) — one page, shared by every
 *     Connection.
 *   - `credential: "none"` (also the default) — unsigned, reports even
 *     before any Connection exists.
 *   - `network.allow` widens egress to the status host for this hook only;
 *     it is deliberately absent from the app's own `api.folk.app`
 *     allowlist.
 *   - `severity` defaults to `degraded` for this kind, so a folk incident
 *     never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "folk.instatus.com";
const COMPONENT_NAME = "folk rest API";

/**
 * Instatus's own component status enum, as returned live by
 * `components.json` (`"OPERATIONAL"` observed) and its documented siblings.
 * Anything not in this map — including an absent component — reports
 * `unknown` rather than guessing.
 */
const COMPONENT: Record<string, HealthState> = {
  OPERATIONAL: "ok",
  UNDERMAINTENANCE: "degraded",
  DEGRADEDPERFORMANCE: "degraded",
  PARTIALOUTAGE: "degraded",
  MAJOROUTAGE: "down",
};

interface InstatusComponent {
  id: string;
  name?: string;
  status?: string;
  children?: InstatusComponent[];
}

function flatten(components: InstatusComponent[]): InstatusComponent[] {
  const out: InstatusComponent[] = [];
  for (const c of components) {
    out.push(c);
    if (c.children) out.push(...flatten(c.children));
  }
  return out;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "folk platform status",
  description:
    "Instatus component status for folk.instatus.com's 'folk rest API' component — the " +
    "component name folk itself gave the surface this app calls. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/components.json`);
    // `unknown`, never `down`: a status API that itself fails tells us nothing about folk.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as { components?: InstatusComponent[] };
    const api = flatten(body.components ?? []).find((c) => c.name === COMPONENT_NAME);
    const state = api ? (COMPONENT[api.status ?? ""] ?? "unknown") : "unknown";

    return {
      state,
      message: api ? undefined : `no "${COMPONENT_NAME}" component in the status page response`,
      components: api ? { api: { state } } : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
