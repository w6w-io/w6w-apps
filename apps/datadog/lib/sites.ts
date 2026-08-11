/**
 * Datadog **sites** — the one design decision this app is built around.
 *
 * Datadog is not one deployment. It is nine independent ones, each with its own
 * hostname, its own data, its own organizations, and (for eight of the nine) its
 * own status page. An API key issued in EU1 is not merely unauthorized on US1 —
 * it does not exist there. There is no cross-site read, no redirect, and no
 * discovery endpoint that tells you which site a key belongs to.
 *
 * ## Why the list is enumerated rather than derived
 *
 * `w6w.network.allow` is a **static, publish-time** egress allowlist, so the
 * choice is between enumerating the sites and supporting exactly one. Datadog's
 * site set is a fixed, published, knowable list — it is an `enum` in the
 * vendor's own OpenAPI `servers` block (`site` variable), and the same nine
 * appear in the site selector on every page of `docs.datadoghq.com/api/latest/`
 * (US1, US3, US5, EU, AP1, AP2, UK1, US1-FED, US2-FED). So this app enumerates
 * them, one `api.<domain>` hostname each, and supports every one.
 *
 * A wildcard (`*.datadoghq.com`) was rejected, and not on taste: `datadoghq.com`
 * carries a **wildcard DNS record**, so `api.zzznotreal.datadoghq.com` and
 * `api.us9.datadoghq.com` both resolve — to `orange.intake.datadoghq.com`, which
 * is US1's intake (measured 2026-08-11). Nothing about resolution distinguishes
 * a real site from a typo. What distinguishes them is the certificate: a real
 * site serves `CN=*.<site-domain>` (UK1 serves `CN=*.uk1.datadoghq.com`), while
 * a made-up one falls back to `CN=*.datadoghq.com`, which does not match a
 * three-label host, so the handshake fails outright. An allowlist that accepted
 * any subdomain would accept every typo as an egress target and turn a
 * mis-typed site into a request against the wrong Datadog.
 *
 * ## Where the site lives
 *
 * On the **Connection**, as an Auth field — not as an Action param. A key pair
 * belongs to exactly one site's organization, so the site and the keys are two
 * halves of one credential. `auth/api-key.ts`'s `afterConnect` republishes it on
 * `connection.display.site`, which is how {@link siteFromConnection} finds it
 * without any Action ever seeing a credential (the same shape `zoho` and
 * `mattermost` use in this pack).
 *
 * ## What is deliberately NOT here
 *
 * Two intake hostnames, because this app calls neither:
 *
 *  - `http-intake.logs.<domain>` — `POST /api/v2/logs`, log submission.
 *  - `event-management-intake.<domain>` — `POST /api/v2/events`, the **v2**
 *    event-publishing endpoint.
 *
 * Both carry a per-operation `servers` override in Datadog's OpenAPI document
 * that swaps the `api` subdomain for an intake one, and both are invisible in
 * the human reference, which renders every endpoint as `https://api.<site>/…`.
 * Sending either to `api.<site>` is a 404 that reads like a broken path. This
 * app posts events through `POST /api/v1/events`, which really is on
 * `api.<site>`, and does not ship logs at all — see the README.
 *
 * Every hostname below was probed live on 2026-08-11: all nine answer
 * `GET /api/v1/validate` with `403 {"errors":["Forbidden"]}`, the documented
 * unauthenticated response, over a certificate naming their own site.
 */
import type { Option, RedactedConnection } from "@w6w/types";

/**
 * Datadog's own `x-enum-varnames` for the `site` server variable, lowercased.
 * Using the vendor's identifiers rather than inventing names keeps this table
 * checkable against the OpenAPI document.
 */
export type DatadogSiteId =
  | "us1"
  | "us3"
  | "us5"
  | "eu1"
  | "ap1"
  | "ap2"
  | "uk1"
  | "gov"
  | "us2_gov";

export interface DatadogSite {
  /** Stable id, stored on the Connection. */
  id: DatadogSiteId;
  /** The `site` variable's value in Datadog's OpenAPI `servers` block. */
  domain: string;
  /** What Datadog's own documentation calls it in the site selector. */
  label: string;
  /** `api.<domain>` — every hostname here is in `w6w.network.allow`. */
  apiHost: string;
}

/**
 * The nine documented sites, in the order Datadog's own site selector lists
 * them. `domain` is copied verbatim from the OpenAPI `site` enum.
 *
 * Note `uk1.datadoghq.com` appears **twice** in the v1 document's enum (first
 * and last entries) — a duplicate in the vendor's own spec, not a second site.
 */
export const SITES: readonly DatadogSite[] = [
  {
    id: "us1",
    domain: "datadoghq.com",
    label: "US1 (datadoghq.com)",
    apiHost: "api.datadoghq.com",
  },
  {
    id: "us3",
    domain: "us3.datadoghq.com",
    label: "US3 (us3.datadoghq.com)",
    apiHost: "api.us3.datadoghq.com",
  },
  {
    id: "us5",
    domain: "us5.datadoghq.com",
    label: "US5 (us5.datadoghq.com)",
    apiHost: "api.us5.datadoghq.com",
  },
  { id: "eu1", domain: "datadoghq.eu", label: "EU1 (datadoghq.eu)", apiHost: "api.datadoghq.eu" },
  {
    id: "ap1",
    domain: "ap1.datadoghq.com",
    label: "AP1 (ap1.datadoghq.com)",
    apiHost: "api.ap1.datadoghq.com",
  },
  {
    id: "ap2",
    domain: "ap2.datadoghq.com",
    label: "AP2 (ap2.datadoghq.com)",
    apiHost: "api.ap2.datadoghq.com",
  },
  {
    id: "uk1",
    domain: "uk1.datadoghq.com",
    label: "UK1 (uk1.datadoghq.com)",
    apiHost: "api.uk1.datadoghq.com",
  },
  {
    id: "gov",
    domain: "ddog-gov.com",
    label: "US1-FED (ddog-gov.com)",
    apiHost: "api.ddog-gov.com",
  },
  {
    id: "us2_gov",
    domain: "us2.ddog-gov.com",
    label: "US2-FED (us2.ddog-gov.com)",
    apiHost: "api.us2.ddog-gov.com",
  },
];

/**
 * US1 is the fallback, matching the `site` variable's own `default` in Datadog's
 * OpenAPI document — but it is only ever reached when a Connection carries no
 * site at all, which `auth/api-key.ts` makes a required field precisely so it
 * cannot happen. A wrong site is a `403`, never a silent read of someone else's
 * data, because the key does not exist at the other site.
 */
export const DEFAULT_SITE_ID: DatadogSiteId = "us1";

export function siteById(id: string | undefined): DatadogSite | undefined {
  if (!id) return undefined;
  const wanted = String(id).trim().toLowerCase();
  return SITES.find((s) => s.id === wanted) ??
    // Accept the raw domain too: it is what Datadog's own `DD_SITE` env var
    // holds, so it is what people paste.
    SITES.find((s) => s.domain === wanted);
}

/** `https://api.<domain>` — the only origin any Action or check builds. */
export function apiBase(site: DatadogSite): string {
  return `https://${site.apiHost}`;
}

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface DatadogConnectionDisplay {
  site?: string;
  apiHost?: string;
  org?: { name?: string; publicId?: string };
}

/**
 * Resolve the Connection's site.
 *
 * Reads `connection.display.site`, published by `afterConnect` from the Auth
 * field. Actions never see the credential, so this is the only channel by which
 * "which Datadog?" reaches the code that builds a URL.
 */
export function siteFromConnection(connection: RedactedConnection | undefined): DatadogSite {
  const display = (connection?.display ?? {}) as DatadogConnectionDisplay;
  return siteById(display.site) ?? siteById(DEFAULT_SITE_ID)!;
}

/** The `select` options for the Auth `site` field. */
export const siteOptions: Option[] = SITES.map((s) => ({ value: s.id, label: s.label }));
