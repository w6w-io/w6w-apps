/**
 * Is ShipStation's V2 API up? — and, separately, are the carriers it fronts.
 *
 * ## The real page, and the component that is actually this app
 *
 * Verified 2026-08-25: `status.shipstation.com` is a genuine, claimed Statuspage
 * instance (`page.name` = `"ShipStation"`, page id `dk88pmqrx0sd`). It lists **34**
 * components, grouped, including:
 *
 * - A `ShipStation Companion API` group containing **`Companion API V1`** and
 *   **`Companion API V2`** as separate components — this app calls V2 only, so only
 *   `Companion API V2` decides this check's verdict. `Companion API V1` is a different
 *   (deprecated) API this app does not use, and folding it in would fail this app's
 *   health on an outage of code it never calls.
 * - A `Carriers` group (Stamps.com, FedEx, UPS, DHL Express, DHL eCommerce, Canada
 *   Post, Australia Post, Royal Mail, Purolator, Parcelforce, DPD, Endicia, Express 1,
 *   Amazon Buy Shipping API — 14 members as of this writing). A single carrier being
 *   down does not mean ShipStation's own API is down — you simply cannot get rates or
 *   labels from *that* carrier — so these are reported **by name**, informationally,
 *   and never worsen this check's verdict.
 * - A top-level `ShipStation` component (the web dashboard/UI) and `Marketplaces`,
 *   `Marketplace Integrations`, `Support Services`, `Integrations` groups — none of
 *   which this API-only app touches. Ignored here on purpose.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.shipstation.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** The component that IS this app. Matched by name — it is unique and unambiguous. */
const OWN = /^companion api v2$/i;

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "ShipStation V2 API status",
  description:
    "The `Companion API V2` component on ShipStation's status page — the only component this " +
    "app calls. Carrier outages (UPS, FedEx, USPS/Stamps.com, ...) are reported by name but do " +
    "not count toward this verdict, because a dead carrier leaves the API itself fine.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: StatuspageComponent[] }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // The Carriers GROUP id, discovered by finding the group any known carrier
    // component belongs to — resolved dynamically rather than hardcoded, since
    // Statuspage assigns opaque ids that are only stable for THIS page instance.
    const carrierGroupId =
      body.components.find((c) =>
        !c.group && /^(fedex|ups|dhl|canada post|royal mail|stamps\.com|purolator)$/i.test(
          String(c.name ?? ""),
        )
      )?.group_id ?? undefined;

    const components: Record<string, { state: HealthState; message?: string }> = {};
    let ownState: HealthState | undefined;
    const badCarriers: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!name) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };

      if (OWN.test(name)) {
        ownState = state;
      } else if (carrierGroupId && c.group_id === carrierGroupId && c.status !== "operational") {
        badCarriers.push(`${name}: ${c.status}`);
      }
    }

    if (ownState === undefined) {
      return {
        state: "unknown",
        message: "the status page no longer names a `Companion API V2` component",
        components: Object.keys(components).length > 0 ? components : undefined,
      };
    }

    const parts: string[] = [
      ownState === "ok" ? "Companion API V2 operational" : `Companion API V2: ${ownState}`,
    ];
    if (badCarriers.length > 0) {
      parts.push(
        `carriers affected (ShipStation's own API is unaffected): ${badCarriers.join(", ")}`,
      );
    }

    return {
      state: ownState,
      message: parts.join(" · "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
