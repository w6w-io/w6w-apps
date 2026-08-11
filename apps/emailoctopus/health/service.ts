/**
 * Is EmailOctopus up? — `status.emailoctopus.com`.
 *
 * ## The page is real, and it is not an Atlassian one
 *
 * Verified three ways on 2026-08-11.
 *
 * **(a) Is it a catch-all?** No — four sibling paths, three answers:
 *
 *   | Path                                   | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 430   | `28f78236ddfa` |
 *   | `/api/v2/status.json`                  | 200     | 214   | `41818d91d178` |
 *   | `/api/v2/components.json`              | 200     | 218   | `f516c966c647` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * **(b) Does it describe THIS product?** Yes:
 * `"page": { "name": "EmailOctopus", "url": "https://status.emailoctopus.com/" }`,
 * and the Atom feed titles itself "EmailOctopus status".
 *
 * **(c) Who serves it?** **incident.io**, not Atlassian — `server: Vercel`,
 * `x-matched-path: /[slug]/api/v2/[endpoint]`, `<generator>incident.io` in the
 * feed, and ULID page/component ids (`01KAV9NP…`) rather than Statuspage's
 * base-32. It implements the Statuspage v2 *shape*, which is why this reads
 * like the pack's other Statuspage checks, but two differences matter:
 *
 *   1. **`summary.json` has no `incidents` and no `scheduled_maintenances` key
 *      at all** — the live body is exactly `{ page, status, components }`.
 *      `body.incidents.length` would throw, so every access here is optional.
 *   2. **The history feed is empty.** `/history.atom` returns a well-formed
 *      518-byte Atom document with zero `<entry>` elements: the page was
 *      created 2025-11-24 and has recorded no incidents since. There is
 *      therefore nothing for a `feed:` declaration to read, which is why this
 *      check is a JSON fetch and not a feed-backed one.
 *
 * ## What this page does and does not say about the API
 *
 * It publishes **one** component, named `Platform`. There is no separate `API`,
 * `Sending` or `Dashboard` row, so this check cannot distinguish "the API is
 * down" from "the dashboard is down" — it is a whole-product rollup. That is
 * the reason this app also declares a separate `api` check that probes
 * `api.emailoctopus.com` directly: the two answer different questions, and only
 * the second is evidence about the host an action actually calls.
 *
 * ## Annotation
 *
 *   - `kind: "service"` — vendor uptime, distinct from credential liveness (the
 *     derived `auth:*` check) and from headroom (`quota`).
 *   - `scope: "app"` — one answer for every Connection; running it per
 *     Connection multiplies one useful call by the number of users.
 *   - `credential: "none"` — stated explicitly because it is the precondition
 *     for the `network` widening below. A third-party status host must never
 *     see an EmailOctopus API key.
 *   - `network.allow` — `status.emailoctopus.com` is deliberately absent from
 *     the app's own egress allowlist; no action has any business calling it.
 *   - `severity` is left at the `degraded` default for this kind, so a vendor
 *     incident never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.emailoctopus.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
}

/** Statuspage's per-component vocabulary, which incident.io mirrors. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "full_outage":
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/** The page-level rollup indicator. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "EmailOctopus platform status",
  description:
    "Rollup from status.emailoctopus.com, an incident.io page serving the Statuspage v2 shape. It publishes a single `Platform` component covering the whole product, so it does not report the API separately — the `api` check does that.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };

    // Guard against a future rebrand or redirect quietly pointing this probe at
    // somebody else's page — a healthy status page for the wrong product.
    const name = body.page?.name ?? "";
    if (name && !/emailoctopus/i.test(name)) {
      return { state: "unknown", message: `status page now self-identifies as "${name}"` };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[slug(node.name!)] = state === "ok"
        ? { state }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    // Both keys are absent entirely on this page rather than `[]` — see the
    // module docs. Every access is optional for that reason.
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state: mapIndicator(body.status?.indicator),
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
