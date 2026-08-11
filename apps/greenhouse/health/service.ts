/**
 * Is Greenhouse up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * Greenhouse publishes at **`status.greenhouse.io`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes  |
 *   | -------------------------------------- | ------- | ------ |
 *   | `/api/v2/summary.json`                 | 200     | 52,224 |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0**  |
 *
 * **(b) Content type AND body.** `application/json`, parsing as the Statuspage
 * v2 schema. Neither known unclaimed-host signature matches: an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML, an unclaimed `*.instatus.com`
 * ~216,800 B. This is 52,224 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "z1fpkbyft3qn", "name": "Greenhouse",
 *               "url": "https://status.greenhouse.io" }
 *
 * and it carries a component group named exactly **"Greenhouse Harvest API"**,
 * which is the surface this app calls.
 *
 * ## Three findings that shape the code below
 *
 * **1. The verdict comes from the Harvest API group, not the page indicator.**
 * The page has 118 components, and 39 of them are neither Greenhouse nor
 * anything this app touches: 22 Fastly CDN points of presence, 17 AWS
 * components, plus a `Third-Party Integrations` group carrying LinkedIn, Slack,
 * Calendly, BambooHR, OpenAI and Adobe Acrobat Sign. `status.indicator` rolls up
 * all of them, so deriving the verdict from it would report the Harvest API down
 * because a Fastly PoP in Perth is having a bad afternoon. The eleven components
 * inside `Greenhouse Harvest API` are the ones that answer the question this
 * check is asked, so they set the state; the page indicator is reported in the
 * message, and every component is still published so a reader can see the rest.
 *
 * That said, the AWS components are reported rather than filtered out for a
 * documented reason: Greenhouse serves candidate attachments from S3 behind
 * signed URLs and its own general-considerations note says "In the event AWS S3
 * is experiencing issues, document attachments will not be available in
 * Harvest." An S3 incident really is a Greenhouse incident, just not one that
 * makes the API unreachable — which is exactly the difference between a
 * component report and a verdict.
 *
 * **2. Component names are NOT unique.** "Silo 1" appears three times — once
 * under `Greenhouse Recruiting`, once under `Greenhouse Harvest API`, once under
 * `Greenhouse Business Intelligence Connector` — with three different ids and
 * three independent statuses. Keying components by name would collapse them and
 * silently drop two thirds of the rows. They are keyed by the vendor's id, and
 * the message carries `<group> — <name>` so a reader can tell which "Silo 1"
 * they are looking at.
 *
 * **3. Group rows are containers.** A `group: true` row mirrors its children, so
 * publishing it would double-count every silo. Groups are used only to resolve
 * membership and are never reported as components in their own right.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Greenhouse is SaaS-only,
 * so every Connection this app can hold runs on exactly the infrastructure this
 * page describes.
 *
 * `credential: "none"` is stated explicitly because it is the precondition for
 * the `network` widening below — a status host must never see a Greenhouse token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.greenhouse.io/api/v2/summary.json";

/** The group whose members decide the verdict, by id and by name. */
export const HARVEST_GROUP_ID = "ghc9lfkqzz51";
export const HARVEST_GROUP_NAME = "Greenhouse Harvest API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
  components?: string[];
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
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

/**
 * Find the Harvest API group by id, falling back to its name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference, so it is tried first; the name match exists only so a future page
 * that re-creates the group under a new id still resolves rather than silently
 * falling back to the whole-page indicator.
 */
export function findHarvestGroup(components: StatusComponent[]): StatusComponent | undefined {
  return components.find((c) => c.group === true && c.id === HARVEST_GROUP_ID) ??
    components.find((c) =>
      c.group === true && (c.name ?? "").trim().toLowerCase() === HARVEST_GROUP_NAME.toLowerCase()
    );
}

/** Key a component by the vendor's id, falling back to a slug of the name. */
export function componentKey(component: StatusComponent, index: number): string {
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
  title: "Greenhouse platform status",
  description:
    "Component status from status.greenhouse.io. The verdict comes from the eleven components " +
    "inside the Greenhouse Harvest API group; Recruiting, Onboarding, the HRIS links, the " +
    "third-party integrations and the AWS and Fastly infrastructure are reported alongside them " +
    "but do not set it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.greenhouse.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Greenhouse — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — the failure mode where a healthy, claimed status page
    // belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.greenhouse\.io(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Greenhouse's",
      };
    }

    const all = body.components ?? [];
    const groups = all.filter((c) => c.group === true);
    const leaves = all.filter((c) => c?.name && c.group !== true);
    if (leaves.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const groupNameById = new Map<string, string>();
    for (const group of groups) {
      if (group.id && group.name) groupNameById.set(group.id, group.name);
    }

    const components: Record<string, HealthComponentReport> = {};
    leaves.forEach((leaf, index) => {
      const state = mapComponentStatus(leaf.status);
      const groupName = leaf.group_id ? groupNameById.get(leaf.group_id) : undefined;
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, and "Silo 1" alone is ambiguous across three groups.
      const label = groupName ? `${groupName} — ${leaf.name}` : `${leaf.name}`;
      components[componentKey(leaf, index)] = state === "ok"
        ? { state, message: label }
        : { state, message: `${label}: ${leaf.status}` };
    });

    const harvestGroup = findHarvestGroup(all);
    const harvestIds = new Set(harvestGroup?.components ?? []);
    const harvestLeaves = harvestGroup
      ? leaves.filter((leaf) =>
        (leaf.id && harvestIds.has(leaf.id)) || leaf.group_id === harvestGroup.id
      )
      : [];

    const indicator = body.status?.indicator;
    // Verdict from the Harvest API group when it can be resolved; the page-wide
    // indicator only as a fallback, because it rolls up 39 components this app
    // never touches.
    const state = harvestLeaves.length > 0
      ? worstHealthState(harvestLeaves.map((leaf) => mapComponentStatus(leaf.status)))
      : mapIndicator(indicator);

    const notes: string[] = [];
    if (harvestLeaves.length === 0) {
      notes.push(
        "the Greenhouse Harvest API component group was not found; falling back to the " +
          "page-wide indicator, which also covers Recruiting, Onboarding and third parties",
      );
    }
    if (body.status?.description) notes.push(`page: ${body.status.description}`);
    const affected = leaves.filter((leaf) => mapComponentStatus(leaf.status) !== "ok");
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((leaf) => `${leaf.name} (${leaf.status})`).join(", ")}`);
    }
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
