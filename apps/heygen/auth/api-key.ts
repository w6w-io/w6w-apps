import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatHeyGenError } from "../lib/client.ts";

/**
 * HeyGen API key — `X-Api-Key: <key>`.
 *
 * Verified against `components.securitySchemes.ApiKeyAuth` in HeyGen's OpenAPI document
 * (`type: apiKey, in: header, name: x-api-key`) and against the vendor's own docs
 * (`developers.heygen.com/docs/api-key.md`: "All HeyGen API requests authenticate via the
 * `X-Api-Key` header"), plus live probes against `api.heygen.com` on 2026-08-24. The document
 * also lists a `BearerAuth` (OAuth2) scheme, but that authenticates the CLI/MCP surface as the
 * user's own web account against subscription credits — the docs are explicit that production,
 * batch and workflow traffic should use an API key instead, which is the only credential shape a
 * host-mediated Connection can hold anyway.
 *
 * ## The probe is the vendor's own "verify your key" endpoint
 *
 * `GET /v3/users/me` is what HeyGen's own API Key guide tells integrators to call to confirm a
 * key works ("You can verify your key is working by fetching your account info... A 200 response
 * with your account details confirms your key is valid"). Its schema (`UserInfoResponse`) carries
 * only `username`, `email`, `first_name`, `last_name` and a `billing_type`-gated billing block
 * (`wallet` | `subscription` | `usage_based`) — no key, token or other credential material, so
 * unlike Apify's `/users/me` or Follow Up Boss's `/me`, this whoami is safe to use directly as
 * both the liveness probe and the `afterConnect` label source.
 *
 * ## A missing key and a wrong key look identical
 *
 * Measured live 2026-08-24: no `X-Api-Key` header and a syntactically-plausible-but-fake key both
 * answer `401 {"error":{"code":"unauthorized","message":"Unauthorized",...}}` — byte-identical,
 * the same failure mode documented pack-wide for TidyCal. `test` cannot tell "the credential never
 * reached the request" from "the credential is wrong" and does not claim to.
 */

export interface HeyGenCredential {
  apiKey: string;
}

/** The one place the wire format is built, so a probe and the real `sign` never drift apart. */
export function authHeaders(credential: Partial<HeyGenCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

/** The vendor's own "verify your key" endpoint — see the module doc for why it is safe to use. */
export const PROBE_PATH = "/v3/users/me";

interface UserInfoBody {
  data?: { username?: string; email?: string | null };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from the HeyGen dashboard (Settings > API, or app.heygen.com/home?nav=API).",
  connectionLabel: "HeyGen ({{username}})",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "HeyGen dashboard > Settings > API. Requests authenticate via the X-Api-Key header.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps the header and
   * returns. HeyGen also accepts the header name case-insensitively on the wire, but this is the
   * one place the literal name is written.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HeyGenCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint is safe to call directly. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HeyGenCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let code: string | undefined;
    try {
      code = (JSON.parse(raw) as { error?: { code?: string } })?.error?.code;
    } catch { /* not JSON */ }

    if (code === "unauthorized" || res.status === 401) {
      return {
        ok: false,
        message:
          "HeyGen rejected the API key (401 unauthorized). A missing key and an invalid one " +
          "answer identically, so check it was copied exactly from the dashboard and has not " +
          "been rotated.",
      };
    }
    if (code === "phone_verification_required") {
      return {
        ok: false,
        message:
          "The key is valid, but the account must complete phone verification before it can be " +
          "used (403 phone_verification_required). Complete verification in the HeyGen app.",
      };
    }
    return {
      ok: false,
      message: formatHeyGenError(
        res.status,
        "GET",
        PROBE_PATH,
        raw,
        res.headers.get("retry-after"),
      ),
    };
  },

  /**
   * Publish the account's username and email — both explicitly documented on `UserInfoResponse`
   * and neither a credential. A failure here is deliberately silent: `test` has already
   * established the key is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<HeyGenCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as UserInfoBody;
      const username = body?.data?.username;
      if (!username) return {};
      return body?.data?.email ? { username, email: body.data.email } : { username };
    } catch {
      return {};
    }
  },
};

export default apiKey;
