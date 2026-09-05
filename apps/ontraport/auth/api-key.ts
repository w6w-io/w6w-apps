import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, CREDENTIAL_PROBE_PATH, isAuthFailureBody } from "../lib/client.ts";

/**
 * Ontraport's credential: two headers, always sent together.
 *
 * Verified against the "Authentication" section of `api.ontraport.com/doc/`
 * and against live probes on 2026-09-05.
 *
 * ## `Api-Key` + `Api-Appid` — a pair, not two independent secrets
 *
 * "This must be used in conjunction with your unique site ID or your request
 * will not authenticate" (the doc's own wording for `Api-Key`). There is no
 * OAuth surface and no per-tenant host — one App ID identifies the account,
 * one API Key authenticates the caller against it, and both travel as plain
 * headers on every request. Type is `"custom"` rather than `"apiKey"` because
 * the built-in `apiKey` config only places a single header/query/body value;
 * this credential is two headers at once.
 *
 * ## The probe: `GET /1/Contacts/getInfo`
 *
 * Chosen by elimination against this pack's own banned patterns:
 *
 *  - It requires the credential — measured live, both headers missing,
 *    wrong, or half-present all answer `401` (see below).
 *  - It returns **no contact data at all**, only a count and the account's
 *    own field-list settings — unlike `GET /1/Contacts` (or any other list
 *    endpoint), which would hand back real customer PII on every health
 *    check and every reconnect.
 *  - It needs no ID, no object type, and no parameter that could itself be
 *    wrong — a probe that could fail for a reason OTHER than the credential
 *    would misreport a working Connection as broken.
 *
 * ## Classifying the failure: text, not a status code, not a vendor error code
 *
 * Ontraport's error and response codes table documents `401 Unauthorized —
 * You are not authenticated` as prose, not as a machine-readable body shape.
 * Measured live: the body is `content-type: text/html`, plain text, exactly
 * `"Your App ID and API Key do not authenticate."` — identical whichever of
 * the two headers is missing or wrong, and with no `code`/`data` envelope of
 * any kind. So `test` cannot key off a JSON error field (there isn't one) and
 * must not key off the bare status alone (per this pack's own rule) — it
 * reads the body text via {@link isAuthFailureBody}, the same helper the
 * client's generic error formatter uses, so there is exactly one place that
 * decides what an Ontraport auth failure looks like.
 */

export interface OntraportCredential {
  apiKey: string;
  appId: string;
}

/**
 * The one place the wire format is built, so `test` and `sign` cannot drift
 * apart on header names or casing.
 */
export function authHeaders(credential: Partial<OntraportCredential>): Record<string, string> {
  return {
    "api-key": credential.apiKey ?? "",
    "api-appid": credential.appId ?? "",
  };
}

/** Re-exported for tests that pin the probe path without reaching into `lib/client.ts`. */
export const PROBE_PATH = CREDENTIAL_PROBE_PATH;

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key & App ID",
  description: "From Ontraport, go to Settings > Integrations > API to generate your API Key, " +
    "and Settings > Integrations > API for your App ID (your unique site ID). Both are required.",
  connectionLabel: "Ontraport ({{appId}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings > Integrations > API in your Ontraport account.",
    },
    {
      key: "appId",
      label: "App ID",
      type: "string",
      required: true,
      hint: "Your unique site ID, shown on the same API settings screen (e.g. 2_AppID_12345678).",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps both headers and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<OntraportCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} and the module doc for why this endpoint and this classification. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<OntraportCredential>;
    const apiKeyValue = (cred?.apiKey ?? "").trim();
    const appIdValue = (cred?.appId ?? "").trim();
    if (!apiKeyValue || !appIdValue) {
      return {
        ok: false,
        message: `credential missing ${!apiKeyValue ? "apiKey" : "appId"}`,
      };
    }

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        ...authHeaders({ apiKey: apiKeyValue, appId: appIdValue }),
      },
    });
    const text = await res.text().catch(() => "");

    if (isAuthFailureBody(text)) {
      return {
        ok: false,
        message: "Ontraport rejected the App ID / API Key pair — reconnect with values copied " +
          "exactly from Settings > Integrations > API.",
      };
    }
    if (!res.ok) {
      return { ok: false, message: `Ontraport returned HTTP ${res.status} for ${PROBE_PATH}` };
    }

    let body: { code?: number; data?: { count?: string } } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      return {
        ok: false,
        message: "Ontraport returned an unreadable body for the credential probe",
      };
    }
    if (body?.code !== 0) {
      return {
        ok: false,
        message: `Ontraport returned an unexpected response code (${body?.code})`,
      };
    }
    return { ok: true };
  },
};

export default apiKey;
