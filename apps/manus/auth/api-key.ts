import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, type AvailableCredits } from "../lib/client.ts";

/**
 * Manus API key — `x-manus-api-key: <key>`.
 *
 * Verified against `open.manus.ai/docs/v2/authentication` and the OpenAPI
 * document's `components.securitySchemes.ApiKeyAuth` (fetched 2026-09-05),
 * plus live probes against `api.manus.ai` the same day.
 *
 * ## API key over OAuth2, deliberately
 *
 * Manus documents two auth methods: this header, and an `Authorization:
 * Bearer <access_token>` OAuth2 flow "for third-party apps that act on behalf
 * of a user" (the "Open App" flow, requiring a Team account and a per-app
 * user-consent screen). This app implements only the API-key method — it
 * models unattended, server-to-server access to one's own account, exactly
 * what the docs recommend it for ("your own integrations and scripts"),
 * whereas OAuth2 here is a *different account owner delegating to a
 * third-party app*, a distinct use case with its own consent/scopes model
 * this app does not attempt to drive.
 *
 * ## No scoping to choose a "narrower" probe against
 *
 * Unlike some vendors, a Manus API key is not scoped: "each key provides full
 * access to your Manus account" (`open.manus.ai/docs/v2/authentication`). So
 * there is no permission model to route around when picking a liveness probe
 * — any inexpensive read works equally well. `usage.availableCredits` is used
 * here because it needs no query parameters, costs no credits to call, and
 * doubles as the source for the `quota` health check (see `health/quota.ts`)
 * — the same "one endpoint, two purposes" reasoning this pack uses elsewhere
 * (e.g. Apify's account-limits probe).
 *
 * ## Live-verified error shape
 *
 * `GET /v2/agent.list` on 2026-09-05, both unauthenticated and with a
 * syntactically plausible fake key, returned HTTP 401 with:
 *
 * ```json
 * {"ok":false,"request_id":"...","error":{"code":"unauthenticated","message":"invalid api key"}}
 * ```
 *
 * — a real, schema-shaped refusal (`ErrorResponse` in the OpenAPI document),
 * not a generic gateway error.
 */

export interface ManusCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `test`/`sign` never drift apart. */
export function authHeaders(credential: Partial<ManusCredential>): Record<string, string> {
  return credential.apiKey ? { "x-manus-api-key": credential.apiKey } : {};
}

interface CreditsEnvelope {
  ok: boolean;
  data?: AvailableCredits;
  error?: { code?: string; message?: string };
}

/**
 * The credential-liveness probe: `GET /v2/usage.availableCredits`. Never
 * echoes the key back — only the account's own credit balance, which is not
 * credential material.
 */
async function probeCredits(
  apiKey: string,
  ctx: HookContext,
): Promise<{ ok: true; credits: AvailableCredits } | { ok: false; message: string }> {
  const res = await ctx.fetch(`${API_BASE}/v2/usage.availableCredits`, {
    headers: { accept: "application/json", ...authHeaders({ apiKey }) },
  });
  const body = await res.json().catch(() => null) as CreditsEnvelope | null;

  if (res.ok && body?.ok && body.data) {
    return { ok: true, credits: body.data };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      message:
        `Manus rejected the API key (${res.status}${
          body?.error?.code ? ` ${body.error.code}` : ""
        }). Check it was copied exactly from Manus API Integration settings (manus.im, ` +
        "Settings > Integrations) and has not been revoked.",
    };
  }
  return {
    ok: false,
    message: `Manus returned HTTP ${res.status} for /v2/usage.availableCredits${
      body?.error?.message ? `: ${body.error.message}` : ""
    }`,
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from the Manus webapp (Settings > Integrations > API). Each account can " +
    "hold up to 50 keys, and each provides full access to the account.",
  apiKey: { in: "header", name: "x-manus-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one at manus.im under Settings > Integrations > API. Shown only once at " +
        "creation time.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: it stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<ManusCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link probeCredits} for why `usage.availableCredits` and not a task/project endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ManusCredential>;
    const token = (cred?.apiKey ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };

    const result = await probeCredits(token, ctx);
    if (!result.ok) return result;
    return { ok: true };
  },
};

export default apiKey;
