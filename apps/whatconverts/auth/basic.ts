import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * WhatConverts API Token + Secret (`basic`) — `Authorization: Basic base64(token:secret)`.
 *
 * Verified live on 2026-08-29 against `whatconverts.com/api/overview/` ("HTTP requests to
 * the API are protected with HTTP Basic authentication... a token and secret") and against
 * `app.whatconverts.com/api/v1/leads`.
 *
 * ## Two key kinds, one credential shape
 *
 * WhatConverts issues a **Profile Key** (scoped to one profile — Tracking → Integrations →
 * API Keys → Generate API Key) or, on an agency plan, a **Master Account Key** ("Agency
 * Key" — agency dashboard → Integrations → API Keys → Add API Key). Both are a token+secret
 * pair presented the same way, so one Auth method covers both; which kind a given pair is
 * only shows up as which resources it can reach (Accounts/Profiles/Roles/Users all require
 * a Master Account Key, confirmed by the vendor's own per-page "Agency Key is required to
 * access this resource" notice — this app does not attempt to detect that in advance).
 *
 * ## The probe, and why it is not an obvious alternative
 *
 * `GET /leads?leads_per_page=1` was chosen because it is the one endpoint every credential
 * kind can reach — a Profile Key is refused on every agency-only resource, so probing one
 * of those (`/accounts`, `/users`, `/roles`) would report a perfectly good Profile Key
 * connection as broken. `/leads` needs no scope beyond "some profile key or account key",
 * matching WhatConverts's own examples of the *unscoped* base case.
 *
 * ## Status code alone does not distinguish "no credential" from "wrong credential"
 *
 * Both cases answer HTTP 401. Confirmed live on 2026-08-29:
 *   - no `Authorization` header at all → `{"error_message":"Authentication not provided."}`
 *   - a syntactically valid but wrong token:secret pair → `{"error_message":"Authentication failed."}`
 * `test` below classifies on that message text, not the shared status code — the two cases
 * point at different fixes (the credential never reached the request vs. it was rejected).
 *
 * ## A wrong path 404s into the web app, not the API
 *
 * A request to an undeclared `/api/v1/...` path answers `404` with the WhatConverts web
 * app's own HTML "page couldn't be found" shell rather than a JSON error — confirmed live.
 * `test` treats a non-JSON body as "unreadable", never as evidence the credential is bad.
 */

export interface WhatConvertsCredential {
  token: string;
  secret: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<WhatConvertsCredential>): Record<string, string> {
  const token = credential.token ?? "";
  const secret = credential.secret ?? "";
  return { authorization: `Basic ${btoa(`${token}:${secret}`)}` };
}

/** See the module doc for why `/leads`, not an agency-only resource. */
export const PROBE_PATH = "/leads";

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API Token & Secret",
  description:
    "A Profile Key (Tracking > Integrations > API Keys) or, on an agency plan, a Master " +
    "Account Key (agency dashboard > Integrations > API Keys). Both present the same way: " +
    "an API token and its paired secret.",
  connectionLabel: "WhatConverts",
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The token half of the key pair generated in WhatConverts. Paired with the API " +
        "Secret, it grants full read/write access to the account, so it is treated as " +
        "sensitive too, not merely as an identifier.",
    },
    {
      key: "secret",
      label: "API Secret",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The secret half of the key pair generated in WhatConverts.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<WhatConvertsCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<WhatConvertsCredential>;
    if (!cred?.token || !cred?.secret) {
      return { ok: false, message: "credential missing token or secret" };
    }

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?leads_per_page=1`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (res.ok) return { ok: true };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("json")) {
      return {
        ok: false,
        message: `WhatConverts returned a non-JSON ${res.status} response for ${PROBE_PATH} — ` +
          "cannot confirm the credential either way.",
      };
    }

    const body = await res.json().catch(() => null) as { error_message?: string } | null;
    const message = body?.error_message;

    if (message === "Authentication not provided.") {
      return {
        ok: false,
        message: "WhatConverts received no credential — the connection did not reach the " +
          "request. Reconnect this connection.",
      };
    }
    if (message === "Authentication failed." || res.status === 401) {
      return {
        ok: false,
        message: `WhatConverts rejected the API token/secret (${res.status}` +
          `${message ? `: ${message}` : ""}). Check both halves were copied exactly from ` +
          "WhatConverts > Integrations > API Keys.",
      };
    }
    return {
      ok: false,
      message: `WhatConverts returned HTTP ${res.status}${message ? `: ${message}` : ""} for ` +
        PROBE_PATH,
    };
  },
};

export default basic;
