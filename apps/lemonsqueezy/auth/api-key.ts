import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage, JSON_API_TYPE } from "../lib/client.ts";

/**
 * Lemon Squeezy API key — `Authorization: Bearer <api_key>`.
 *
 * Verified against `docs.lemonsqueezy.com/api/getting-started/requests`
 * (fetched 2026-09-05) and live probes against `api.lemonsqueezy.com` the
 * same day.
 *
 * ## No environment field, no host to pick
 *
 * A key created in Test mode and one created in Live mode both call
 * `api.lemonsqueezy.com` — the vendor's docs: "Any API keys created in Test
 * mode will interact with your test mode store data." Which dataset a call
 * touches is decided by the key alone, and every resource this app reads
 * carries its own `test_mode` boolean. Unlike `apps/paddle`, there is nothing
 * for `sign` to rewrite.
 *
 * ## The probe is `GET /v1/users/me`, the vendor's own worked example
 *
 * `docs.lemonsqueezy.com/api/getting-started/requests` uses exactly this call
 * as its "Authenticated request example" — it needs a credential (probed
 * 2026-09-05: no `Authorization` header answers `401 Unauthenticated`, same as
 * a bogus bearer token) and needs no scoped permission beyond "is this key
 * valid", since Lemon Squeezy API keys are not permission-scoped the way
 * Paddle's are. The response body is the caller's own account profile (name,
 * email, avatar) — never the credential itself.
 *
 * ## Errors are real HTTP status codes with a JSON:API body
 *
 * `{"jsonapi":{"version":"1.0"},"errors":[{"detail":"Unauthenticated.",
 * "status":"401","title":"Unauthorized"}]}` — a real `401`, not a `200` with
 * an error object, for both a missing and an invalid bearer token (measured
 * 2026-09-05). `test` still reads the body for `detail`, per this pack's rule
 * to classify from the response body rather than the status code alone.
 */

export interface LemonSqueezyCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` never drift apart. */
export function authHeaders(credential: Partial<LemonSqueezyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

interface WhoAmI {
  data?: {
    attributes?: {
      name?: string;
      email?: string;
    };
  };
  meta?: { test_mode?: boolean };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from your Lemon Squeezy account settings (Settings > API). Create a " +
    "Test mode key to develop against test data, or a Live mode key for production — both use " +
    "the same host, and every response is stamped with the `test_mode` it belongs to.",
  connectionLabel: "Lemon Squeezy ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one at app.lemonsqueezy.com/settings/api. Lemon Squeezy shows the key once " +
        "and cannot show it again.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * only stamps the bearer header. There is no host to rewrite.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<LemonSqueezyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<LemonSqueezyCredential>;
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { accept: JSON_API_TYPE, "content-type": JSON_API_TYPE, ...authHeaders(cred) },
    });

    if (res.ok) return { ok: true };

    const detail = errorMessage(await res.text().catch(() => ""));
    return {
      ok: false,
      message: `Lemon Squeezy rejected the key (${res.status}${detail ? `: ${detail}` : ""})`,
    };
  },

  /**
   * Publishes the account's name/email (for `connectionLabel`) and whether
   * this key is a Test-mode or Live-mode key — the one distinction that
   * matters here, since both share a host and a client.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<LemonSqueezyCredential>;
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { accept: JSON_API_TYPE, "content-type": JSON_API_TYPE, ...authHeaders(cred) },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as WhoAmI | null;
    const attrs = body?.data?.attributes;
    return {
      ...(attrs?.name ? { name: attrs.name } : {}),
      ...(attrs?.email ? { email: attrs.email } : {}),
      ...(typeof body?.meta?.test_mode === "boolean" ? { testMode: body.meta.test_mode } : {}),
    };
  },
};

export default apiKey;
