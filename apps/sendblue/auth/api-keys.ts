import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Sendblue's API-key pair — two custom headers, not a single bearer token.
 *
 * Verified against `docs.sendblue.com/getting-started/credentials` and every
 * worked `curl` example across the reference (2026-08-25): every request
 * carries both
 *
 * ```
 * sb-api-key-id: <API Key>
 * sb-api-secret-key: <API Secret>
 * ```
 *
 * The credentials page itself writes the header names upper-cased
 * (`SB-API-KEY-ID`); HTTP header names are case-insensitive and every worked
 * `curl`/Node/Python example in the reference sends them lower-cased, which is
 * what `sign` does here too. There is no OAuth surface, no single combined
 * token, and no query-string form — every credential goes on the wire as
 * these two headers, full stop.
 *
 * `type: "custom"` (not `apiKey`) because `Auth.apiKey` only models ONE
 * header/query/body slot; Sendblue needs two independent ones. See
 * `amplitude/auth/api-keys.ts` in this pack for the same pattern.
 */
export interface SendblueCredential {
  apiKeyId: string;
  apiSecretKey: string;
}

/** The one place the wire format is built, so `sign` and `test` never drift apart. */
export function authHeaders(credential: Partial<SendblueCredential>): Record<string, string> {
  return {
    "sb-api-key-id": credential.apiKeyId ?? "",
    "sb-api-secret-key": credential.apiSecretKey ?? "",
  };
}

/**
 * The credential-liveness probe: `GET /api/v2/contacts/count`.
 *
 * Chosen over the tempting `GET /api/v2/seats/count` or `GET /api/v2/lines/state`
 * because it needs nothing beyond a plain messaging-plan account — no team
 * seats, no assigned phone line — so it stays green for the narrowest paid
 * plan this app can be connected to. Its response is `{"count": number}`:
 * no phone numbers, no message content, no credential material of any kind.
 *
 * ## Classifying failure from the BODY, never the status code alone
 *
 * Two failure shapes were confirmed live against `api.sendblue.co` on
 * 2026-08-25 and they are NOT the same shape:
 *
 *  - No credential headers at all: `403 {"message": "Did not get inputs for
 *    authorization"}` — note there is no `status` field here, unlike every
 *    other documented error on this API.
 *  - A syntactically-plausible but wrong key/secret pair: `401
 *    {"status": "ERROR", "message": "Invalid Credentials"}`.
 *
 * A check that only looked at "401 vs not-401" would report the first case as
 * a generic failure with no actionable message; this one tells the two apart
 * by the response body.
 */
export const PROBE_PATH = "/api/v2/contacts/count";

const apiKeys: AuthDefinition = {
  key: "api-keys",
  type: "custom",
  displayName: "API Key & Secret",
  description:
    "Your Sendblue API Key and API Secret, from the Sendblue dashboard (or `sendblue show-keys` " +
    "via the Sendblue CLI). Both are required on every request as the sb-api-key-id / " +
    "sb-api-secret-key headers.",
  connectionLabel: "Sendblue",
  fields: [
    {
      key: "apiKeyId",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Sendblue dashboard, or `sendblue show-keys`. Sent as the sb-api-key-id header.",
    },
    {
      key: "apiSecretKey",
      label: "API Secret",
      type: "secret",
      required: true,
      hint: "Sendblue dashboard, or `sendblue show-keys`. Sent as the sb-api-secret-key header.",
    },
  ],

  /**
   * The only hook given the raw credential, and it runs network-less: it
   * stamps both headers and returns the request. Neither header value is a
   * bearer token, so there is no prefix to add.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<SendblueCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and how the two failure shapes are told apart. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SendblueCredential>;
    if (!cred?.apiKeyId?.trim() || !cred?.apiSecretKey?.trim()) {
      return { ok: false, message: "credential is missing the API Key or API Secret" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Sendblue: ${String(err)}` };
    }

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { status?: string; message?: string }
      | null;

    if (res.status === 403 && !body?.status) {
      return {
        ok: false,
        message: "Sendblue received no credential headers — the connection did not reach the " +
          "request. Reconnect this connection.",
      };
    }
    if (res.status === 401 || body?.message === "Invalid Credentials") {
      return {
        ok: false,
        message: "Sendblue rejected the API Key / API Secret pair. Re-copy both values from " +
          "the Sendblue dashboard — a mismatched pair (right key, wrong secret) fails the same " +
          "way as two wrong values.",
      };
    }
    return {
      ok: false,
      message: `Sendblue returned HTTP ${res.status}${body?.message ? `: ${body.message}` : ""} ` +
        `for ${PROBE_PATH}`,
    };
  },
};

export default apiKeys;
