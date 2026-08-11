/**
 * Is Basecamp up?
 *
 * ## Three traps and one real page
 *
 * Checked on 2026-08-11. Basecamp is the sharpest example in this pack of why
 * the obvious status host must be verified rather than assumed:
 *
 *   | Candidate | Result |
 *   | --- | --- |
 *   | `status.basecamp.com` | A real page — its title is **"37signals Status"** — but it serves the identical **264,473-byte** HTML for every path, `/api/v2/summary.json` and a nonsense path alike. A catch-all; no readable API. |
 *   | `basecamp.statuspage.io` | **200 with 127,697 bytes** — the unclaimed-Statuspage shell. |
 *   | `basecamphq.statuspage.io` | **200 with 127,697 bytes** — the same shell. |
 *   | `bc3.statuspage.io` | **200 with 127,697 bytes** — the same shell again. |
 *   | **`37signals.statuspage.io`** | **200 with 2,636 bytes of real JSON**, and **404 with 0 bytes** on a bogus sibling path. |
 *
 * Three plausible subdomains all answer `200` with the generic "create your own
 * status page" marketing shell that Atlassian serves for any *unregistered*
 * name. Any of them would look configured and parse as nothing, forever.
 *
 * The real page is 37signals', because Basecamp is a 37signals product — and it
 * self-identifies:
 *
 *     "page": { "id": "thc30769z1m9", "name": "37signals",
 *               "url": "https://www.37status.com" }
 *
 * Its eight components are the company's products: **`Basecamp 5`**, `HEY`,
 * `Basecamp 2`, `Basecamp Classic`, `Highrise`, `Campfire`, `Backpack`, `Fizzy`.
 *
 * ## The component this app cares about is named, and only that one counts
 *
 * This is what makes the check worth having rather than merely present. The page
 * covers seven other products; `HEY` having an incident says nothing about
 * whether this app works. So the verdict is taken from the **`Basecamp 5`**
 * component specifically, not from the page-level indicator — and the others are
 * still reported as components, so an operator can see the wider picture without
 * it changing the answer.
 *
 * That is why this check keeps the `degraded` default for its kind rather than
 * dropping to `informational`, unlike `apps/formstack`, whose portfolio page has
 * no single component that means "this product". Here there is one, and when it
 * is down every Basecamp Connection really is affected — Basecamp is SaaS-only.
 *
 * `credential: "none"` is the precondition for the `network` widening below.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://37signals.statuspage.io/api/v2/summary.json";

/** The component that speaks for this app. Everything else on the page is another product. */
export const BASECAMP_COMPONENT = /^basecamp\s*5$/i;

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

/** Slugify a component name into a stable selector. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Basecamp platform status",
  description:
    "Reads 37signals' status page and takes its verdict from the `Basecamp 5` component " +
    "specifically — the page also covers HEY, Highrise and older Basecamps, which say nothing " +
    "about this app.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["37signals.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Basecamp — never `down`.
      return { state: "unknown", message: `Statuspage returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) {
      // The likeliest cause is a redirect onto one of the unclaimed subdomains,
      // which serve HTML. Reporting `unknown` beats parsing marketing copy.
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }

    // Guard against a future redirect or rebrand: the page must still be
    // 37signals'. Three neighbouring subdomains serve an unclaimed shell.
    const identity = `${body.page?.name ?? ""} ${body.page?.url ?? ""}`;
    if (identity.trim() && !/37signals|37status|basecamp/i.test(identity)) {
      return { state: "unknown", message: "status page no longer self-identifies as 37signals'" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Statuspage returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[componentId(node.name!)] = state === "ok"
        ? { state }
        : { state, message: node.status };
    }

    // The verdict comes from the one component that is this product. If the
    // vendor ever renames it, that is reported as `unknown` rather than being
    // silently replaced by an unrelated product's health.
    const basecamp = nodes.find((n) => BASECAMP_COMPONENT.test(n.name!.trim()));
    if (!basecamp) {
      return {
        state: "unknown",
        message: "the page no longer lists a Basecamp 5 component",
        components,
      };
    }

    const state = mapComponentStatus(basecamp.status);
    const others = nodes.filter((n) => n !== basecamp && mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [`Basecamp 5: ${basecamp.status}`];
    if (others.length > 0) {
      // Reported, but deliberately not counted — another product's outage is not
      // this app's.
      notes.push(`other 37signals products affected: ${others.map((n) => n.name).join(", ")}`);
    }
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s) on the page`);

    return { state, message: notes.join("; "), components, ttlSeconds: 60 };
  },
};

export default service;
