/**
 * Is Deputy's platform up?
 *
 * Deputy publishes **`https://status.deputy.com`**, an Atlassian Statuspage.
 * Re-verified live on 2026-09-22 (`GET /api/v2/summary.json`, 200,
 * `application/json`): `page.name` is `"Deputy.com"`, `page.url` is
 * `https://status.deputy.com`, and `status.indicator` is `none` /
 * `"All Systems Operational"`. No open incidents and no scheduled maintenance
 * were listed at that moment.
 *
 * ## Only Deputy's own side of the page counts
 *
 * The page carries 22 components across two groups, and most of one group is
 * **not Deputy**:
 *
 *   - `Deputy - All regions` (`zg6tq4vnjk8d`), a `group: true` roll-up of
 *     `Deputy - USA` (`bhphp9znxrkg`), `Deputy - AU` (`yxx9yjs32q18`) and
 *     `Deputy - UK` (`jz98n2lh3hff`) — the four tracked here, and the only ones
 *     that describe the thing this app calls. The group is Statuspage's
 *     derivation from its three children, so tracking both cannot change the
 *     verdict; the children are tracked so a degraded report can name the
 *     region that is actually affected.
 *   - `Third Party Components` — a second `group: true` container holding
 *     HelloSign/HelloFax, Pusher (three of them), Twilio (two), Xero (two) and
 *     Zuora (two). These are vendors Deputy depends on, labelled with the
 *     vendor's name, and an outage in Pusher's REST API or Zuora's billing
 *     interface says nothing about whether `GET /api/v1/resource/Employee` will
 *     answer. Rolling them into this app's verdict is exactly the mistake this
 *     check exists to avoid, so they are excluded by id rather than by a name
 *     rule that a rename would quietly defeat.
 *   - Deputy's remaining page-level components — `Login Services`
 *     (`once.deputy.com`, the OAuth/account host this app never calls with a
 *     permanent token), `Deputy Website` (the marketing site), `Billing
 *     Services`, `Sandbox`, `POS Integration` and `Deputy Payroll AU` — are
 *     Deputy's, but none of them is the per-install API either. A payroll
 *     outage is not a rostering outage. Left out, and named here so the
 *     omission is a decision rather than an oversight.
 *
 * The page-level `status.indicator` is deliberately not the verdict for the
 * same reason: it rolls up the third-party group too, so a Zuora incident would
 * report this app's dependency as down.
 *
 * `severity` is left at `degraded` for `kind: "service"`: Deputy is SaaS with no
 * self-hosted option, so every Connection this app can hold depends on the
 * components tracked here.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.deputy.com/api/v2/summary.json";

/**
 * The Deputy-owned components that describe this app's API surface. Ids were
 * read live from `summary.json` on 2026-09-22; the names are the page's own.
 * A page that renames a component keeps its id, and a page that drops one is
 * reported as `unknown` rather than as healthy — see `nodes.length === 0`.
 */
export const TRACKED_COMPONENTS: Record<string, string> = {
  "zg6tq4vnjk8d": "Deputy - All regions",
  "bhphp9znxrkg": "Deputy - USA",
  "yxx9yjs32q18": "Deputy - AU",
  "jz98n2lh3hff": "Deputy - UK",
};

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: Array<{ name?: string }>;
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
  title: "Deputy platform status",
  description:
    "Component status from status.deputy.com, scoped to Deputy's own regional API components " +
    "(and their roll-up) — not the page's third-party group (Pusher, Twilio, Xero, Zuora, " +
    "HelloSign) or Deputy's website, billing, sandbox and payroll components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.deputy.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Deputy — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — a healthy, claimed status page belonging to an
    // entirely different product is the failure mode worth refusing.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.deputy\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Deputy's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.id && TRACKED_COMPONENTS[c.id]);
    if (nodes.length === 0) {
      return {
        state: "unknown",
        message: "status.deputy.com no longer lists Deputy's regional components — the tracked " +
          "component ids have changed, so this check cannot read the page any more",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const name = TRACKED_COMPONENTS[node.id!];
      components[node.id!] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${node.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (affected.length > 0) {
      notes.push(
        `affected: ${affected.map((n) => `${TRACKED_COMPONENTS[n.id!]} (${n.status})`).join(", ")}`,
      );
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s) on the page`);
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
