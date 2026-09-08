import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Bitrix24 up? — declared unavailable, and for two independent reasons.
 *
 * **No usable machine-readable feed exists.** `status.bitrix24.com` is
 * genuinely Bitrix24-run (title "Bitrix24 status page", not a decoy) but is a
 * client-rendered SPA: `/api/v2/summary.json` and `/api/v2/status.json` both
 * answered `200 text/html` with an EMPTY body when checked 2026-09-06 — there
 * is no JSON payload behind either path, only the same shell every route on
 * that host serves. A same-named `bitrix24.statuspage.io` also exists and is
 * the unclaimed-Statuspage decoy this pack has hit elsewhere: it 302s straight
 * to `www.statuspage.io`'s own marketing page, confirmed via its response
 * headers (`x-statuspage-skip-logging: true`, no page-specific data).
 *
 * **Even a real feed would answer the wrong question.** Every Connection this
 * app makes points at a customer's own portal — a shared-cloud subdomain
 * (`*.bitrix24.com`) for most, but a fully self-hosted "Bitrix24 Box" install
 * on a private domain for on-premise/enterprise customers. A vendor-wide
 * status page could only ever speak for the shared cloud tier; it would say
 * nothing about an on-premise portal's own uptime, exactly the gap
 * `mautic`'s `service` check documents for self-hosted software. `portal`
 * is the check that answers the question that actually matters here: is
 * *this* Connection's own portal reachable.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Bitrix24 platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.bitrix24.com is genuinely Bitrix24-run but a client-rendered SPA with no JSON " +
      "output (verified 2026-09-06 — /api/v2/summary.json and /api/v2/status.json both answer " +
      "200 text/html with an empty body); bitrix24.statuspage.io is the unclaimed-Statuspage " +
      "decoy, redirecting to statuspage.io's own marketing page. Even a real feed would only " +
      "cover Bitrix24's shared cloud tier, not a self-hosted on-premise portal — the `portal` " +
      "check answers the question that matters for any given Connection.",
  },
};

export default service;
