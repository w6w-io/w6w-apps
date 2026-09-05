import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * JustCall API Key + Secret — `Authorization: api_key:api_secret`.
 *
 * Verified against the `AccessToken` security scheme embedded in every one of
 * this app's per-endpoint OpenAPI fragments (`developer.justcall.io/reference/*`)
 * and against the prose on `developer.justcall.io/reference/authentication`,
 * both fetched 2026-09-05, plus a live unauthenticated probe against
 * `api.justcall.io` the same day.
 *
 * ## `custom`, not `basic` and not `apiKey`
 *
 * The vendor's own scheme description is explicit: *"The API key can be put in
 * the Authorization header. i.e `Authorization: api_key:api_secret`. If you use
 * cURL, specify `-u "api_key:api_secret"`."* That `-u` flag is what curl uses
 * for HTTP **Basic** auth — but Basic auth Base64-encodes the `user:pass` pair
 * before sending it (`Authorization: Basic <base64>`), and JustCall's header
 * has no `Basic ` scheme prefix and no encoding: the literal
 * `api_key:api_secret` string goes on the wire. Declaring `type: "basic"` would
 * therefore send the WRONG header — this app's `sign` builds the raw string
 * itself instead. This also carries two credential fields rather than one, so
 * `custom` is the honest shape, the same choice `apps/bigcommerce` makes for
 * its own two-field, non-standard header.
 *
 * ## No OAuth surface
 *
 * JustCall documents no OAuth flow for third-party API access; the key/secret
 * pair from Settings → APIs and Webhooks is the entire authentication story.
 */

export interface JustCallCredential {
  apiKey: string;
  apiSecret: string;
}

/** The one place the wire format is built — `test` exercises the same code path `sign` does. */
export function authHeaders(credential: Partial<JustCallCredential>): Record<string, string> {
  return { authorization: `${credential.apiKey ?? ""}:${credential.apiSecret ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /v2.1/users?per_page=1` was chosen because JustCall publishes no
 * dedicated ping/whoami endpoint anywhere in its reference (there is no `/me`
 * page in the reference index at all): it is the cheapest **documented, always
 * reachable** read this app's surface has — it needs no path parameter, no
 * resource id, and no permission narrower than "this key can call the API at
 * all". `per_page=1` caps the page at one record so the probe reads as little
 * account data as possible.
 *
 * **This app never returns the probe's body.** `test` reports only `ok`/`message`
 * — the other users' names and emails a real account would return are read to
 * classify liveness and then discarded, never published to the health surface.
 *
 * JustCall's error body does not distinguish a missing credential from a
 * rejected one — both a fully unauthenticated request and one with a
 * syntactically plausible but fake key/secret pair answered identically on
 * 2026-09-05:
 *
 *     HTTP/2 401
 *     {"status":"failed","message":"Unauthorized"}
 *
 * So unlike apps whose vendor names the failure mode in the body, this `test`
 * cannot say "the credential never reached the request" versus "the credential
 * was rejected" — it reports the one thing the API actually tells it.
 */
export const PROBE_PATH = "/users";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key & Secret",
  description:
    "From your JustCall dashboard, open your profile icon → APIs and Webhooks, and copy the API " +
    "Key and API Secret shown there. API access requires the Team plan or above.",
  connectionLabel: "JustCall",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Profile icon → APIs and Webhooks in your JustCall dashboard.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
      hint: "Shown next to the API Key on the same page.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. Never Base64-encoded — see the module doc.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<JustCallCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<JustCallCredential>;
    const key = (cred?.apiKey ?? "").trim();
    const secret = (cred?.apiSecret ?? "").trim();
    if (!key || !secret) return { ok: false, message: "credential missing apiKey or apiSecret" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?per_page=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key, apiSecret: secret }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { status?: string; message?: string } | null;
    if (res.status === 401) {
      return {
        ok: false,
        message:
          `JustCall rejected the request (401${
            body?.message ? ` ${body.message}` : ""
          }). Check that the API Key and Secret were copied exactly and are still active in ` +
          "Profile icon → APIs and Webhooks — JustCall does not distinguish a missing credential " +
          "from a revoked one in this response.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `JustCall refused the request (403${body?.message ? `: ${body.message}` : ""}). ` +
          "API access requires the Team plan or above.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "Could not verify: JustCall's rate limit is exhausted (429). This says nothing " +
          "about the credential — retry shortly.",
      };
    }
    return {
      ok: false,
      message: `JustCall returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },
};

export default apiKey;
