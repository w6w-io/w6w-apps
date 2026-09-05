/**
 * Is Shippo up? — and, separately, **which carriers are**.
 *
 * ## Real Statuspage instance, verified 2026-09-05
 *
 * `status.goshippo.com/api/v2/summary.json` — page id `x4bhgfp1j1x0`, named
 * "Shippo". `status.shippo.com` 301-redirects to the same host, so there is
 * only one page to check.
 *
 * ## Shippo's own services decide the verdict; carriers are reported by name
 *
 * The page lists Shippo's own top-level services — **Shippo REST API**,
 * **Shippo Web Dashboard**, **Shippo Platform API** — alongside a **"Carrier
 * API"** GROUP containing ~65 carriers (USPS, UPS, FedEx, DHL, Aramex, and
 * the rest), each nested under that group's `group_id`.
 *
 * That structure is what this check relies on rather than a hand-maintained
 * name list: a component is "Shippo's own" when it sits at the TOP LEVEL
 * (`group_id === null`) and is not itself a group; every other component is a
 * carrier the "Carrier API" group contains. Verified live 2026-09-05: at that
 * moment "FedEx" and its parent "Carrier API" group both read
 * `partial_outage` while every Shippo-owned component read `operational` —
 * exactly the case this split exists for. A carrier outage is not a Shippo
 * outage: the API answers fine, you simply cannot buy that carrier's label.
 * Rolling those together would report an outage that isn't one; ignoring them
 * would hide the reason a purchase is failing, so **carriers are named in the
 * message** — "UPS is down, buy the FedEx rate" is something a workflow can
 * act on.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.goshippo.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Shippo platform status",
  description:
    "Shippo's own REST API, dashboard and platform API. Carrier outages are reported by name " +
    "but do not count — when FedEx is down, Shippo itself is fine and you buy a different rate.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: Component[] }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const counted: HealthState[] = [];
    const badOwn: string[] = [];
    const badCarriers: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue; // the "Carrier API" group entry itself
      const name = String(c.name ?? "");
      if (!name) continue;
      const isOwn = c.group_id === null || c.group_id === undefined;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };

      if (isOwn) {
        counted.push(state);
        if (c.status !== "operational") badOwn.push(`${name}: ${c.status}`);
      } else if (c.status !== "operational") {
        badCarriers.push(name);
      }
    }

    if (counted.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names any of Shippo's own services",
        components: Object.keys(components).length > 0 ? components : undefined,
      };
    }

    const parts: string[] = [];
    parts.push(badOwn.length > 0 ? badOwn.join("; ") : `${counted.length} services operational`);
    if (badCarriers.length > 0) {
      parts.push(`carriers affected (Shippo itself is unaffected): ${badCarriers.join(", ")}`);
    }

    return {
      state: worstHealthState(counted),
      message: parts.join(" · "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
