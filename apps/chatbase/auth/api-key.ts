import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatChatbaseError } from "../lib/client.ts";

/**
 * Chatbase API key — `Authorization: Bearer <key>`.
 *
 * Verified against `/docs/api-v2/authentication` and the OpenAPI document's
 * `bearerAuth` security scheme (`type: http, scheme: bearer`), fetched
 * 2026-08-29. Chatbase documents exactly one auth mechanism for the API — no
 * OAuth surface for third-party integrations exists.
 *
 * ## v2 requires a Standard Plan or above
 *
 * "API v2 requires a Chatbase Standard Plan or above. Requests from accounts
 * on unsupported plans will be rejected." — a key from a Free/Hobby workspace
 * is otherwise well-formed and will fail every v2 call with
 * `SUBSCRIPTION_API_RESTRICTED_PLAN`. `test` below distinguishes that from a
 * plain bad key, because "upgrade your plan" and "check the key" are
 * different fixes.
 */

export interface ChatbaseCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<ChatbaseCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /agents?limit=1`.
 *
 * Chosen over the alternatives for the same reason Follow Up Boss's `/me` and
 * Mailjet's `/apikey` are banned pack-wide, just from the other direction —
 * Chatbase's `/health` needs **no** credential at all (it is a plain API
 * liveness check, used instead as this app's `service` health check; see
 * `health/service.ts`), so it cannot tell a live key from a missing one. The
 * agent list is the smallest authenticated v2 read: `limit=1` keeps the page
 * to at most one agent's metadata, and an empty workspace still answers `200`
 * with `data: []`, which is a perfectly healthy connection.
 */
export const PROBE_PATH = "/agents";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Chatbase Dashboard > Workspace settings > API keys. Requires a " +
    "Standard Plan or above — API v2 rejects requests from unsupported plans.",
  connectionLabel: "Chatbase",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Chatbase Dashboard > Workspace settings > API keys > Create API Key.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<ChatbaseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and not `/health`. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ChatbaseCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let code: string | undefined;
    try {
      code = (JSON.parse(raw) as { error?: { code?: string } })?.error?.code;
    } catch { /* not JSON */ }

    if (code === "AUTH_MISSING_API_KEY") {
      return {
        ok: false,
        message: "Chatbase received no Authorization header — the credential did not reach the " +
          "request. Reconnect this connection.",
      };
    }
    if (code === "AUTH_INVALID_API_KEY" || code === "AUTH_EXPIRED_API_KEY" || res.status === 401) {
      return {
        ok: false,
        message: `Chatbase rejected the API key (${res.status}${code ? ` ${code}` : ""}). Check ` +
          "it was copied exactly and has not been revoked or expired in Workspace settings > " +
          "API keys.",
      };
    }
    if (code === "SUBSCRIPTION_API_RESTRICTED_PLAN") {
      return {
        ok: false,
        message: "This workspace's plan does not include API v2 access. Upgrade to the Standard " +
          "Plan or above.",
      };
    }
    return { ok: false, message: formatChatbaseError(res.status, "GET", PROBE_PATH, raw) };
  },
};

export default apiKey;
