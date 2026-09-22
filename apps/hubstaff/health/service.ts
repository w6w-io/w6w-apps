import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Hubstaff's API up?
 *
 * ## The page is real, and the decoy path is not
 *
 * `status.hubstaff.com` is a **Better Stack** page, whose own JSON document
 * lives at `/index.json` — not at any Statuspage-shaped path. Verified
 * 2026-09-22:
 *
 * | Path | Status | Bytes |
 * | ---- | ------ | ----- |
 * | `/index.json` | **200** | 53,346 |
 * | `/api/v2/summary.json` | **301** | — |
 *
 * The document self-identifies unambiguously: `company_name`
 * "Netsoft Holdings, LLC" (Hubstaff's parent legal entity), `company_url`
 * "https://hubstaff.com", `custom_domain` "status.hubstaff.com" and subdomain
 * "hubstaff" (created 2020-09-02). It is served as `text/html; charset=utf-8`
 * despite being JSON, which is why this check parses the body rather than
 * trusting the content type.
 *
 * ## A component does speak for this API, and it is not the page roll-up
 *
 * The page has six `status_page_resource` components: Hubstaff Website,
 * Hubstaff Dashboard, **API & Mobile** (resource id `68168`), Hubstaff Account,
 * Hubstaff Tasks, Hubstaff Talent, beside a `status_page_section` and a
 * `status_report`. Only `API & Mobile` covers `api.hubstaff.com`, so that is
 * the one read. The page's own `aggregate_state` is deliberately **not** the
 * verdict: it rolls up the dashboard, website, Tasks and Talent products too,
 * and reporting the API down because the marketing site is having a bad day is
 * exactly the failure this pack's rule about status pages exists to prevent.
 *
 * The component is matched by `attributes.public_name` rather than by id, and
 * both are asserted in the message — the id is stable but opaque, the name is
 * what a reader recognizes.
 *
 * ## Severity
 *
 * `informational`, not the `degraded` default for `kind: "service"`, for two
 * reasons that both matter:
 *
 *  1. **The monitor is coarser than this app.** It lumps the REST API together
 *     with the mobile clients, so a mobile-only incident shows up here as an
 *     API one. It is real evidence, not proof.
 *  2. **An unreachable status host must not pin the app.** `informational`
 *     checks never worsen a roll-up verdict, so a status page that is
 *     unreachable from the run's host — the case this check returns `unknown`
 *     for — cannot leave every Connection reading `unknown` forever. The
 *     derived `auth:organization-access-token` check is what actually verifies
 *     a connection.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Hubstaff token.
 */
export const STATUS_URL = "https://status.hubstaff.com/index.json";

/** The one component that speaks for `api.hubstaff.com`, by its public name. */
export const API_COMPONENT_NAME = "API & Mobile";

/** The same component's Better Stack resource id — the stable fallback. */
export const API_COMPONENT_ID = "68168";

interface BetterStackResource {
  type?: string;
  id?: string;
  attributes?: {
    public_name?: string;
    status?: string;
  };
}

interface BetterStackPage {
  data?: {
    attributes?: {
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
      subdomain?: string;
      aggregate_state?: string;
    };
  };
  included?: BetterStackResource[];
}

/** Better Stack's documented status vocabulary. */
export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a monitor's public name into a stable component key. */
export function componentKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hubstaff API status",
  description:
    "The `API & Mobile` component of status.hubstaff.com (Better Stack), the one monitor that " +
    "covers api.hubstaff.com. Informational: the monitor also stands for the mobile clients, " +
    "and the page's other five components cover unrelated Hubstaff products.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.hubstaff.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      // A broken status API says nothing about Hubstaff — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — /index.json may be gone",
      };
    }

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const identifies = /hubstaff/i.test(attrs.company_url ?? "") ||
      /hubstaff/i.test(attrs.custom_domain ?? "") ||
      /hubstaff/i.test(attrs.subdomain ?? "") ||
      /hubstaff/i.test(attrs.company_name ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Hubstaff's" };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name !== undefined
    );
    const monitor = resources.find((r) =>
      r.attributes?.public_name === API_COMPONENT_NAME || r.id === API_COMPONENT_ID
    );
    if (!monitor) {
      return {
        state: "unknown",
        message: `Status page returned no "${API_COMPONENT_NAME}" component — it may have been ` +
          "renamed",
      };
    }

    const name = monitor.attributes?.public_name ?? API_COMPONENT_NAME;
    const componentState = mapResourceStatus(monitor.attributes?.status);
    const components: Record<string, HealthComponentReport> = {
      [componentKey(name)]: componentState === "ok"
        ? { state: componentState, message: name }
        : { state: componentState, message: `${name}: ${monitor.attributes?.status}` },
    };

    const notes: string[] = [];
    if (monitor.id) notes.push(`resource ${monitor.id}`);
    if (attrs.aggregate_state) notes.push(`page aggregate: ${attrs.aggregate_state}`);
    if (componentState !== "ok") {
      notes.push(`${name} is ${monitor.attributes?.status}`);
    }

    return {
      // One component, so this is the component's own state — not the page's
      // `aggregate_state`, which also rolls up the website, dashboard, Tasks
      // and Talent products.
      state: worstHealthState(Object.values(components).map((c) => c.state)),
      message: notes.join("; "),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
