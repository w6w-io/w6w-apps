/**
 * Is Razorpay up?
 *
 * ## Two personalities on one host, and only one of them is real
 *
 * `status.razorpay.com` *looks* like an Atlassian Statuspage instance at
 * first glance — the obvious guesses all "work":
 *
 *   | Path                                   | Status | Bytes | Content-Type |
 *   | --------------------------------------- | ------ | ----- | ------------- |
 *   | `/api/v2/summary.json`                  | 200    | 3,270 | `text/html`   |
 *   | `/api/v2/status.json`                   | 200    | 3,270 | `text/html`   |
 *   | `/api/v2/definitely-not-real-zzz.json`  | 200    | 3,270 | `text/html`   |
 *
 * All three answer 200 with the byte-identical 3,270-byte HTML shell of a
 * client-rendered SPA — a client-side router's catch-all, not a Statuspage
 * API. Trusting any `/api/v2/*.json` path here silently "succeeds" with
 * garbage.
 *
 * The *real* feed is `/api/services` — a self-hosted **Statping** instance
 * (confirmed via its bundled JS referencing `github.com/statping/statping`,
 * and via `GET /api` returning `{"name": "Razorpay Status Page", "domain":
 * "statping.stage.razorpay.in", ...}`). Measured live 2026-09-01:
 *
 *   | Path              | Status | Bytes | Content-Type       |
 *   | ------------------ | ------ | ----- | ------------------ |
 *   | `/api/services`    | 200    | 5,381 | `application/json` |
 *   | `/api/nonsense-zzz` | 200   | 3,270 | `text/html`        |
 *
 * Different content-type, different byte count, and the body is a live JSON
 * array of Razorpay's own named services (`Payments API`, `Checkout`,
 * `Dashboard`, `Payment Link`, `RazorpayX Payouts`, `RazorpayX Payroll`,
 * `Optimizer`), each carrying `last_check` timestamps from the moment of the
 * request — this is being polled continuously, not a stale decoy.
 *
 * ## Only some of the seven services are this app's surface
 *
 * This app covers the payment-gateway resources (orders, payments, refunds,
 * customers, payment links, invoices, items, plans, subscriptions,
 * settlements, disputes, QR codes) — not RazorpayX's separate banking
 * product. So the verdict is driven by `Payments API`, `Checkout` and
 * `Payment Link` (the `covers` set below); `Dashboard`, `RazorpayX Payouts`
 * and `RazorpayX Payroll` are still reported as components, for context, but
 * do not by themselves worsen the verdict — the same "report but don't let
 * an unrelated dependency drive the roll-up" shape as Apify's `External
 * services` group.
 *
 * ## Statping has no degraded state of its own — this app infers one
 *
 * Statping's `online` field is a plain boolean. `online_24_hours` (a
 * percentage) is used to distinguish a service that is currently up but had
 * a rough day from one that has been solid: `online: true` with
 * `online_24_hours < 100` is reported `degraded`, not `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.razorpay.com/api/services";

/** The services whose state actually drives the verdict — see the module doc. */
export const COVERED_SERVICES = new Set(["Payments API", "Checkout", "Payment Link"]);

interface StatpingService {
  id?: number;
  name?: string;
  online?: boolean;
  online_24_hours?: number;
  permalink?: string;
}

/** A Statping boolean plus its 24h uptime percentage, folded into the four health states. */
export function mapServiceStatus(
  online: boolean | undefined,
  online24h: number | undefined,
): HealthState {
  if (online === undefined) return "unknown";
  if (!online) return "down";
  if (typeof online24h === "number" && online24h < 100) return "degraded";
  return "ok";
}

/** Key a component by its permalink, falling back to a slug of the name. */
export function componentKey(service: StatpingService, index: number): string {
  if (service.permalink) return service.permalink;
  if (service.name) {
    return service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  return `service-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Razorpay platform status",
  description:
    "Component status from status.razorpay.com's live Statping feed (/api/services). Covers " +
    "the Payments API, Checkout and Payment Link components this app calls; Dashboard and the " +
    "separate RazorpayX Payouts/Payroll product are reported for context but do not drive the " +
    "verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.razorpay.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Razorpay — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    // The `/api/v2/*` decoy answers 200 with an HTML shell, so a body that
    // fails to parse as JSON is exactly that trap, not a Razorpay outage.
    const contentType = res.headers.get("content-type") ?? "";
    if (!/json/i.test(contentType)) {
      return { state: "unknown", message: `Status page returned ${contentType || "no"} content` };
    }

    const body = await res.json().catch(() => null) as StatpingService[] | null;
    if (!Array.isArray(body) || body.length === 0) {
      return { state: "unknown", message: "Status page returned no services" };
    }

    const components: Record<string, HealthComponentReport> = {};
    body.forEach((svc, index) => {
      if (!svc?.name) return;
      const state = mapServiceStatus(svc.online, svc.online_24_hours);
      components[componentKey(svc, index)] = {
        state,
        message: state === "ok"
          ? svc.name
          : `${svc.name}: ${
            svc.online === false ? "offline" : `${svc.online_24_hours ?? "?"}% over 24h`
          }`,
      };
    });

    const coveredStates = body
      .filter((svc) => svc.name && COVERED_SERVICES.has(svc.name))
      .map((svc) => mapServiceStatus(svc.online, svc.online_24_hours));
    if (coveredStates.length === 0) {
      return {
        state: "unknown",
        message: "Status page no longer lists Payments API/Checkout/Payment Link",
      };
    }

    const affected = body.filter(
      (svc) => svc.name && mapServiceStatus(svc.online, svc.online_24_hours) !== "ok",
    );

    return {
      state: worstHealthState(coveredStates),
      message: affected.length > 0
        ? `affected: ${
          affected.map((s) =>
            `${s.name} (${s.online === false ? "offline" : `${s.online_24_hours}%`})`
          )
            .join(", ")
        }`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
