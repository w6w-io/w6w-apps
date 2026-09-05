import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Devin publishes no headroom a narrowly-scoped session-management credential
 * can read, so this declares `unavailable` with a reason rather than
 * pretending to probe.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other
 * severity a declared absence pins this App's verdict at `unknown` forever.
 *
 * ## Two things Devin meters, and neither is readable the way this app can use it
 *
 * Verified 2026-09-05 against `docs.devin.ai/api-reference/*` and live probes
 * against `api.devin.ai`:
 *
 * 1. **Request rate.** Live 401/403 responses from `api.devin.ai` carried only
 *    `date`, `content-type`, `content-length` and `server` — no
 *    `X-RateLimit-*`/`RateLimit-*` header of any kind, on `/v1/sessions`,
 *    `/v3/self`, or an unauthenticated `/v3/self`. The API reference documents
 *    a `429` response on every endpoint but never a corresponding remaining-
 *    quota header.
 * 2. **ACU (session compute) consumption.** Devin bills sessions in Agent
 *    Compute Units, and `/v3/organizations/{org_id}/consumption/*` does read
 *    it back — but every consumption endpoint requires the
 *    `ViewOrgConsumption` (org) or `ViewAccountConsumption` (enterprise)
 *    permission and is documented as **"Enterprise plan only"**. A session-
 *    management service user — the credential this app expects, scoped to
 *    `UseDevinSessions`/`ManageOrgSessions` — has no reason to also carry
 *    `ViewOrgConsumption`, and Cognition's own guidance is to grant only the
 *    permissions an integration needs. Probing this endpoint would report a
 *    correctly-scoped, perfectly healthy credential as broken on every
 *    non-Enterprise org and on any Enterprise org whose service user was
 *    (correctly) not given billing visibility.
 *
 * `acus_consumed` is returned on every session response and IS surfaced by
 * this app's session actions — that is per-session spend, not account-wide
 * headroom, so it belongs on the session, not here.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate and ACU headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Devin exposes no request-rate headroom: live 401/403 responses from api.devin.ai carry no " +
      "X-RateLimit-*/RateLimit-* header of any kind (measured 2026-09-05), and the API reference " +
      "documents a 429 response with no accompanying remaining-quota header. Session-compute (ACU) " +
      "consumption IS readable via /v3/organizations/{org_id}/consumption/*, but every consumption " +
      "endpoint requires the ViewOrgConsumption/ViewAccountConsumption permission and is documented " +
      "as Enterprise-plan-only — a narrowly-scoped session-management service user has no reason to " +
      "also hold billing visibility, so probing it would report a correctly-scoped credential as " +
      "broken. Per-session ACU spend (acus_consumed) is surfaced directly on the session actions " +
      "instead.",
  },
};

export default quota;
