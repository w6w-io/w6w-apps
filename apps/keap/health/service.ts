import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Keap up?
 *
 * ## Keap has no status page of its own — it is a group on Thryv's
 *
 * Keap was acquired by Thryv, and the acquisition shows up in three places this
 * app had to account for: the OpenAPI `termsOfService` points at
 * `thryv.com/terms-of-use`, the API contact address is `api.keap@thryv.com`,
 * and `status.keap.com` is a redirect.
 *
 * ## The redirect drops the path, which is why `status.keap.com` looks like a
 * ## catch-all and is not one
 *
 * Measured 2026-08-11:
 *
 *     GET https://status.keap.com/api/v2/summary.json
 *       -> 301, location: https://status.thryv.com          (no path!)
 *       -> 200, text/html, 1,293,064 bytes
 *
 * Every path under `status.keap.com` answers with the same 1.29 MB HTML,
 * because the redirect is to the *apex* and throws the path away. Follow it and
 * you conclude Keap publishes nothing machine-readable. It does — the redirect
 * target's own path space is a perfectly ordinary Atlassian Statuspage:
 *
 *   | Path                                   | Status  | Bytes  | md5 (first 12) |
 *   | -------------------------------------- | ------- | ------ | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 18,010 | `4d867110d499` |
 *   | `/api/v2/status.json`                  | 200     | 223    | `586ed4fd5ffc` |
 *   | `/history.atom`                        | 200     | 54,613 | `00fadd40f5c7` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0**  | —              |
 *
 * Four different answers and a hard 404 on the nonsense path: not a catch-all.
 * Content type `application/json; charset=utf-8`, parsing as the Statuspage v2
 * schema, and matching neither known unclaimed-host signature (an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML; an unclaimed `*.instatus.com` is
 * ~216,800 B).
 *
 * So this check calls `status.thryv.com` **directly**. The runtime allowlists
 * the URL it is given, not the redirect target, so naming `status.keap.com`
 * here would allowlist a host whose only answer is an HTML page.
 *
 * ## The page-level indicator is NOT Keap's verdict
 *
 * This is where the usual Statuspage idiom breaks. `status.indicator` is
 * Thryv's roll-up across **52 components in 6 groups** — Business Center,
 * Marketing Center, MyAccount, Reporting Center, Payments, and Keap. Exactly
 * **one group is Keap's**: `dkpk4thk3t66`, whose 8 children are
 * `Authentication`, `Email`, `Landing Page`, `Forms`, `Contacts/Company`,
 * `Communication (Text,Voice)`, `Automation` and `APIs`. The other 44
 * components are other Thryv products this app never touches.
 *
 * Trusting `status.indicator` — which every other Statuspage-backed app in this
 * pack correctly does — would report Keap down because Thryv's Website Builder
 * is having a bad afternoon. The verdict here is therefore derived from the
 * Keap group's own children, and the page-level indicator is reported as
 * *context in the message only*, never as the state.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Keap is SaaS-only, so
 * every Connection this app can hold runs on exactly the infrastructure this
 * group describes.
 *
 * `credential: "none"` is stated explicitly because it is the precondition for
 * the `network` widening below — a status host must never see a Keap token.
 */
export const STATUS_URL = "https://status.thryv.com/api/v2/summary.json";

/**
 * The Keap group's component id, as published on 2026-08-11.
 *
 * Used only as a fallback. The group is located by NAME first, because a
 * Statuspage id is stable across renames but not across a page rebuild, and a
 * hardcoded id that stops matching would silently report "no Keap components"
 * forever.
 */
export const KEAP_GROUP_ID = "dkpk4thk3t66";

/** The group name Thryv publishes Keap under. */
export const KEAP_GROUP_NAME = "keap";

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
 * Locate the Keap group among the page's components.
 *
 * Exported because getting this wrong is the difference between reporting on
 * Keap and reporting on Thryv, and that deserves a test of its own.
 */
export function findKeapGroupId(components: StatusComponent[]): string | undefined {
  const byName = components.find(
    (c) => c.group === true && (c.name ?? "").trim().toLowerCase() === KEAP_GROUP_NAME,
  );
  if (byName?.id) return byName.id;
  const byId = components.find((c) => c.id === KEAP_GROUP_ID);
  return byId?.id;
}

/** The Keap group's leaf components — the ones this app's verdict is built from. */
export function keapComponents(
  components: StatusComponent[],
  groupId: string,
): StatusComponent[] {
  return components.filter((c) => c.group !== true && c.group_id === groupId && c.name);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Keap platform status",
  description:
    "The Keap group on Thryv's status page — Authentication, APIs, Automation, Contacts/Company, " +
    "Email, Forms, Landing Page and Communication. Thryv's other products share the page and are " +
    "deliberately excluded from the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.thryv.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Keap — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand pointing this probe at someone
    // else's page — the failure mode where a healthy, claimed status page
    // belongs to an entirely different product. This one already moved once.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.thryv\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: `status page self-identifies as ${pageUrl}, not status.thryv.com`,
      };
    }

    const all = body.components ?? [];
    const groupId = findKeapGroupId(all);
    if (!groupId) {
      // Falling back to the page-level indicator here would report on Thryv,
      // not on Keap. Saying so is the honest answer.
      return {
        state: "unknown",
        message: "Thryv's status page no longer publishes a Keap component group; its page-level " +
          "indicator covers other Thryv products and is not evidence about Keap",
      };
    }

    const nodes = keapComponents(all, groupId);
    if (nodes.length === 0) {
      return { state: "unknown", message: "The Keap component group is empty" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[node.id ?? slug(node.name!)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    // Context, never the verdict: this covers all 6 Thryv product groups.
    const indicator = body.status?.indicator;
    if (indicator && indicator !== "none") {
      notes.push(
        `Thryv-wide indicator ${indicator}` +
          `${body.status?.description ? ` (${body.status.description})` : ""}` +
          " — covers Thryv products beyond Keap",
      );
    }
    // Incident and maintenance counts are page-wide for the same reason.
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s) page-wide`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s) page-wide`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default service;
