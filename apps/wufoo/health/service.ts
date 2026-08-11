/**
 * Is Wufoo up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 * `/api/v2/summary.json` returns 286 bytes of JSON;
 * `/api/v2/definitely-not-real-zzz.json` returns **404 with 0 bytes**.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Atlassian Statuspage v2 schema — not HTML wearing a `.json` suffix. The
 * two known unclaimed-host signatures do not match: an unclaimed
 * `*.statuspage.io` is ~127,700 B and an unclaimed `*.instatus.com` ~216,800 B.
 * (`wufoo.statuspage.io` resolves to the byte-identical payload — md5
 * `eb4af9bb7d25` for both — so it is the same *claimed* page reached by its
 * Statuspage-native name, not a separate unclaimed one.)
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "ty0zzz68ykq3", "name": "Wufoo",
 *               "url": "https://status.wufoo.com" }
 *
 * ## The finding that shapes the code: there are no components
 *
 * Wufoo's page publishes an **empty `components` array**. Verified: the whole
 * body is a `page`, an empty `components`, an empty `incidents`, an empty
 * `scheduled_maintenances`, and a page-level
 * `status: {indicator: "none", description: "All Systems Operational"}`.
 *
 * That matters because the sibling checks in this pack (`metabase`, `paddle`,
 * `mattermost`) treat "no components" as `unknown` — a page that lists nothing
 * has usually broken. Here it is the *normal* state, and reporting `unknown`
 * forever would make the check useless. So this one reads the page-level
 * indicator as authoritative and only falls back to components if the vendor
 * ever starts publishing them.
 *
 * Wufoo is a SurveyMonkey product and SurveyMonkey runs its own page at
 * `status.surveymonkey.com` (also claimed, one component, named "SurveyMonkey").
 * That page is deliberately **not** used: it describes a different product, and
 * an incident on one is not evidence about the other.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"` — deliberately, and
 * unlike the self-hostable apps in this pack. Wufoo is SaaS-only: there is no
 * self-hosted Wufoo, so every Connection this app can hold runs on exactly the
 * infrastructure this page describes.
 *
 * `credential: "none"` is the precondition for the `network` widening below — a
 * third-party status host must never see the API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.wufoo.com/api/v2/summary.json";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatuspageComponent[];
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

/** The page-level roll-up — authoritative here, since there are no components. */
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

/** Slugify a component name, for the day Wufoo starts publishing them. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Wufoo platform status",
  description:
    "Page-level status from status.wufoo.com (Atlassian Statuspage). Wufoo publishes no " +
    "per-component detail, so the page indicator is the whole signal.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.wufoo.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Wufoo — never `down`.
      return { state: "unknown", message: `Statuspage returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    // Guard against a future redirect or rebrand pointing this probe at somebody
    // else's page — SurveyMonkey's own page is one hop away and describes a
    // different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)wufoo\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Wufoo's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[componentId(node.name!)] = state === "ok"
        ? { state }
        : { state, message: node.status };
    }

    // The indicator is authoritative: this page ships no components, so an
    // empty list is the normal state rather than a broken page. Components are
    // still folded in if the vendor ever starts publishing them.
    const indicator = body.status?.indicator;
    const state = indicator !== undefined
      ? mapIndicator(indicator)
      : nodes.length > 0
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : "unknown";

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) notes.push(`affected: ${affected.map(([id]) => id).join(", ")}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: nodes.length > 0 ? components : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
