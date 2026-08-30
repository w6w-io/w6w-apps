import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatQuoError } from "../lib/client.ts";

/**
 * Quo API key — a single, unprefixed `Authorization: <key>` header, generated per workspace
 * under Settings > API (owner/admin only).
 *
 * Verified against Quo's own auth guide ("The Quo API does not use a Bearer token for
 * authentication") and OpenAPI security scheme (`{"type": "apiKey", "in": "header", "name":
 * "Authorization"}`, no prefix), plus live probes against `api.quo.com` on 2026-08-30.
 *
 * ## One key, full workspace access — no scopes
 *
 * "Each key provides full API access" (Quo's own docs) — there is nothing narrower to request,
 * so {@link PROBE_PATH} needs no disclosure about a capability it might not cover.
 *
 * ## The probe doubles as the docs' own first step
 *
 * `GET /v1/phone-numbers` needs no required query parameters (unlike `calls`/`messages`, which
 * require a `phoneNumberId` this hook has no reason to already know) and is literally step 1 of
 * Quo's own "Send your first message" quickstart — so this probe is exactly what a new
 * integration would call first anyway, not a check invented for this purpose.
 */
export interface QuoCredential {
  apiKey: string;
}

/** The one place the wire format is built — `test` and `sign` both reuse it. */
export function authHeaders(credential: Partial<QuoCredential>): Record<string, string> {
  return { authorization: credential.apiKey ?? "" };
}

export const PROBE_PATH = "/phone-numbers";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from your Quo workspace (Settings > API — owner/admin only).",
  apiKey: { in: "header", name: "authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Workspace Settings > API > Generate API key. Requires owner or admin access; " +
        "the key grants full access to the workspace, so treat it like a password.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<QuoCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<QuoCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const detail = await res.text().catch(() => "");
    return { ok: false, message: formatQuoError(res.status, "GET", PROBE_PATH, detail) };
  },
};

export default apiKey;
