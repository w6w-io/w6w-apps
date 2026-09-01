import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Tracking API Key (`apiKey`, `in: "query"`, `auth_token`).
 *
 * Vero's Track API is authenticated by a query parameter named `auth_token`
 * (an alias, `tracking_api_key`, is also documented but `auth_token` is what
 * every code sample and the embedded OpenAPI `securitySchemes` entry uses —
 * `{ "api_key": { "type": "apiKey", "name": "auth_token", "in": "query" } }`).
 * Verified 2026-09-01 against help.getvero.com/api-reference/users/identify's
 * embedded schema and confirmed live against `api.getvero.com`.
 *
 * Found under **Vero 2.0**: Settings → Project → API Keys → Tracking Keys, or
 * **Vero 1.0**: Settings → Track API Keys. Vero 2.0 renamed "Auth Tokens" to
 * "Tracking API Keys" — same credential, new name.
 *
 * This is deliberately NOT the Campaigns API's key (a separate, gated
 * public-preview credential used for broadcasts/journeys/topics) — this app
 * only implements the Track API, so it only ever needs the Tracking API Key.
 *
 * There is no dedicated ping/whoami endpoint — the Track API is write-only.
 * `test` sends the same `POST /users/track` the `identify` action uses, with
 * a fixed test id and `extras.update_only: "true"` so a nonexistent test
 * profile is never created — only an existing one would be touched, and
 * `w6w-connection-test` is not a real customer.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Tracking API Key",
  description:
    "Vero 2.0: Settings → Project → API Keys → Tracking Keys. Vero 1.0: Settings → Track API " +
    "Keys. Travels as the `auth_token` query parameter on every request.",
  connectionLabel: "Vero",
  apiKey: { in: "query", name: "auth_token" },
  fields: [
    {
      key: "apiKey",
      label: "Tracking API Key",
      type: "secret",
      required: true,
      hint:
        "Settings → Project → API Keys → Tracking Keys (Vero 2.0) or Track API Keys (Vero 1.0).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const url = new URL(request.url);
    url.searchParams.set("auth_token", apiKey);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const url = new URL(`${API_BASE}/users/track`);
    url.searchParams.set("auth_token", apiKey);
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "w6w-connection-test", extras: { update_only: "true" } }),
    });
    const body = await res.json().catch(() => null) as { status?: number; message?: string } | null;
    if (!res.ok || body?.status !== 200) {
      return { ok: false, message: body?.message ?? `Vero returned ${res.status}` };
    }
    return { ok: true };
  },
};

export default apiKey;
