/**
 * Is Mollie up?
 *
 * `status.mollie.com` looked, at a glance, like it might be an Atlassian
 * Statuspage instance — a common pattern in this pack. It is not: it is an
 * **Instatus**-hosted page (confirmed by its Next.js asset paths under
 * `/_next/static/`), which uses a different JSON shape and different path
 * set. Measured live on 2026-09-01:
 *
 *   | Path                       | Status | Content-Type       | Shape                              |
 *   | --------------------------- | ------ | ------------------ | ----------------------------------- |
 *   | `/api/v2/summary.json`      | 200    | `application/json` | real, but only `{page, activeMaintenances}` — no components, no incidents |
 *   | `/api/v2/incidents.json`    | 404    | `text/html`        | Instatus has no such path (Atlassian-Statuspage-shaped guess fails) |
 *   | `/api/v2/components.json`   | 200    | `application/json` | the real per-component tree, nested groups + leaves |
 *
 * `summary.json` is real (not a decoy) but nearly useless here — Instatus's
 * summary omits the components list entirely unless something is actively
 * degraded, and omits incidents too. `components.json` is the feed this
 * check actually reads: every component carries its own `status` string
 * (`OPERATIONAL`, or a degraded/outage value), nested under groups
 * (`"Platform availability"`, `"International payment methods"`, …). One of
 * its own leaves is literally named **"Mollie API"** with description
 * `"api.mollie.com"` — about as close to ground truth as a status feed gets.
 *
 * ## Only some of the ~50 components are this app's surface
 *
 * This app calls `api.mollie.com` for Payments, Refunds, Chargebacks,
 * Methods, Payment Links, Customers, Mandates and Subscriptions — not any
 * *specific* local/international payment method (iDEAL, Klarna, Cards, …),
 * which Mollie tracks and reports individually. The verdict is driven by the
 * small `COVERED` set below (the platform/API-level components this app's
 * actions actually depend on); every other component is still reported, for
 * context, but never worsens the roll-up on its own — the same
 * report-but-don't-drive shape used elsewhere in this pack (e.g. Apify's
 * `External services` group, Razorpay's `Dashboard`/RazorpayX components).
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.mollie.com/api/v2/components.json";

/** The components whose state actually drives the verdict — see the module doc. */
export const COVERED_COMPONENTS = new Set([
  "Mollie API",
  "Mollie Connect",
  "Webhook",
  "Mollie payment links",
  "Hosted checkout",
]);

interface InstatusComponent {
  id?: string;
  name?: string;
  status?: string;
  isParent?: boolean;
  children?: InstatusComponent[];
}

/** Instatus statuses, folded into the four host-level states. Unknown strings stay `unknown`. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "UNDERMAINTENANCE":
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

/** Flatten the (nested, grouped) component tree into a single list of leaves and groups alike. */
function flatten(components: InstatusComponent[]): InstatusComponent[] {
  const out: InstatusComponent[] = [];
  for (const c of components) {
    out.push(c);
    if (c.children?.length) out.push(...flatten(c.children));
  }
  return out;
}

function componentKey(component: InstatusComponent): string {
  if (component.id) return component.id;
  if (component.name) return component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return "component";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mollie platform status",
  description:
    "Component status from status.mollie.com's Instatus feed (/api/v2/components.json). Covers " +
    "the Mollie API, Mollie Connect, Webhook, payment links and hosted checkout components this " +
    "app depends on; individual local/international payment-method components are reported for " +
    "context but do not drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.mollie.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Mollie itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!/json/i.test(contentType)) {
      return { state: "unknown", message: `Status page returned ${contentType || "no"} content` };
    }

    const body = await res.json().catch(() => null) as { components?: InstatusComponent[] } | null;
    const all = flatten(body?.components ?? []);
    if (all.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const c of all) {
      if (!c.name || c.isParent) continue; // groups are structural, not a state of their own
      const state = mapComponentStatus(c.status);
      components[componentKey(c)] = {
        state,
        message: state === "ok" ? c.name : `${c.name}: ${c.status ?? "unknown"}`,
      };
    }

    const covered = all.filter((c) => c.name && COVERED_COMPONENTS.has(c.name));
    if (covered.length === 0) {
      return {
        state: "unknown",
        message: "Status page no longer lists the Mollie API/Connect/Webhook components",
      };
    }

    const coveredStates = covered.map((c) => mapComponentStatus(c.status));
    const affected = all.filter((c) =>
      c.name && !c.isParent && mapComponentStatus(c.status) !== "ok"
    );

    return {
      state: worstHealthState(coveredStates),
      message: affected.length > 0
        ? `affected: ${affected.map((c) => `${c.name} (${c.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
