import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Luma API key — `x-luma-api-key: <key>`.
 *
 * Verified against Luma's OpenAPI 3.1 document
 * (`components.securitySchemes.apiKeyAuth`, fetched 2026-09-01: `type: apiKey`,
 * `in: header`, `name: x-luma-api-key`) and live probes against
 * `public-api.luma.com` the same day.
 *
 * ## Every key is scoped to exactly one calendar
 *
 * "API keys are scoped to a single calendar. Each calendar you want to manage
 * via the API needs its own key, and each key only grants access to the
 * calendar it was created on" (docs.luma.com/reference/getting-started-with-your-api).
 * There is no separate "calendar id" credential field: the calendar a
 * Connection acts on is entirely determined by which key was pasted in, which
 * is why no Action in this app accepts a `calendarId` param.
 *
 * ## No prefix, no bearer scheme
 *
 * The header carries the raw key with no `Bearer ` or other prefix — confirmed
 * both in the OpenAPI security scheme and in Luma's own curl example
 * (`curl -H "x-luma-api-key: $LUMA_API_KEY" https://public-api.luma.com/v1/users/get-self`).
 */

export interface LumaCredential {
  apiKey: string;
}

/** Header name, exported so `sign` and `test` build it identically. */
export const API_KEY_HEADER = "x-luma-api-key";

/**
 * The one place the wire format is built.
 */
export function authHeaders(credential: Partial<LumaCredential>): Record<string, string> {
  return { [API_KEY_HEADER]: credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe.
 *
 * `GET /v1/users/get-self` was chosen after reading the response schema and
 * measuring the wire live on 2026-09-01:
 *
 *  - It requires a credential: no header answers `400 {"message":"Please
 *    provide an API key.","code":null}`; a syntactically-plausible but fake
 *    key answers `401 {"message":"You are not signed in.","code":null}`. Both
 *    observed live.
 *  - Its response (`User`: `id`, `name`, `avatar_url`, `email`, `first_name`,
 *    `last_name`) carries no credential material of any kind — unlike Apify's
 *    `/v2/users/me`, there is no embedded proxy password or signing secret
 *    here to strip.
 *  - It needs no scope beyond "a valid calendar key can read something", so
 *    it works for every credential this app can hold — Luma's key model has
 *    no narrower/wider tiers to worry about missing a scope for.
 */
export const PROBE_PATH = "/v1/users/get-self";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from your calendar's Settings > API page (luma.com/calendar/manage/api-keys). " +
    "Each key is scoped to exactly one calendar — generate a separate key per calendar you want to " +
    "manage.",
  connectionLabel: "Luma ({{email}})",
  apiKey: { in: "header", name: API_KEY_HEADER },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "luma.com/calendar/manage/api-keys — select the calendar first, then generate a key. " +
        "The key grants full read/write access to that calendar; store it securely.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. The key never appears in a URL or query
   * string.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<LumaCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for how this endpoint was chosen. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LumaCredential>;
    const apiKeyValue = (cred?.apiKey ?? "").trim();
    if (!apiKeyValue) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: apiKeyValue }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string; code?: string } | null;

    if (res.status === 400) {
      return {
        ok: false,
        message: body?.message ??
          "Luma reported the API key never reached the request — reconnect this connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Luma rejected the API key (401${body?.message ? `: ${body.message}` : ""}). ` +
          "Check it was copied exactly and has not been deleted from " +
          "luma.com/calendar/manage/api-keys.",
      };
    }
    return {
      ok: false,
      message: `Luma returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },

  /**
   * Publish the connected calendar's user identity (name/email), so a list of
   * Connections that all read "Luma" is usable.
   *
   * The `User` schema this reads (`id`, `name`, `avatar_url`, `email`,
   * `first_name`, `last_name`) carries no credential material, so nothing is
   * stripped before returning — unlike Apify's `afterConnect`, which must drop
   * a proxy password off the equivalent call.
   *
   * A failure here is deliberately silent: `test` has already established the
   * key is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<LumaCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        id?: string;
        name?: string | null;
        email?: string;
        avatar_url?: string;
      };
      if (!body?.email) return {};
      return {
        email: body.email,
        name: body.name ?? body.email,
        userId: body.id,
      };
    } catch {
      return {};
    }
  },
  /**
   * No `revoke`. Luma's API surface has no "delete this key" endpoint — keys
   * are managed entirely from the calendar's Settings > API page in the UI —
   * so there is nothing this hook could call.
   */
};

export default apiKey;
