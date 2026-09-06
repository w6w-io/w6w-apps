import type { AuthDefinition } from "@w6w/types";
import { BASE_PATH, HOST } from "../lib/client.ts";

/**
 * NeverBounce API Key.
 *
 * Minted in the dashboard as a "Custom Integration App" (`Version 4 of our
 * API simplifies the authentication schema by using static API keys that look
 * like this: secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`, per
 * `docs/authentication`). The OAS security scheme declares it as an
 * `apiKey`-in-query parameter named `key`, accurate for every GET endpoint;
 * `sign` below additionally covers the POST-body case the docs' own examples
 * use for `/jobs/create`, `/jobs/parse`, `/jobs/start`, and `/jobs/delete` —
 * see `lib/client.ts`'s module doc for the full finding.
 *
 * ## The probe: `GET /account/info`
 *
 * Chosen because:
 *   - It never echoes the API key back — the response carries only
 *     `credits_info` and `job_counts`. Compare with traps this pack has hit
 *     before (Mailjet's `/apikey`, Follow Up Boss's `/me`), where the
 *     "whoami" IS the credential.
 *   - It costs nothing and is reachable on every account (it's the same call
 *     `docs/error-handling`'s Node.js sample uses to demonstrate error
 *     handling in the first place).
 *   - It is the same read `health/quota.ts` needs anyway, so this pack pays
 *     for one call, not two.
 *
 * Liveness is read from the body's `status` field, never the HTTP status
 * alone — `docs/error-handling` documents every API-level error, including a
 * bad key (`status: "auth_failure"`), as arriving on a 200. See
 * `lib/client.ts`'s module doc for the full error-shape finding.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a static API key from a NeverBounce Custom Integration App (dashboard → Apps). Sent " +
    "as the `key` query parameter on GET requests, or as a `key` field in the JSON body for " +
    "POST requests, which this app always encodes as JSON rather than form data.",
  apiKey: { in: "query", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.neverbounce.com → Apps → your Custom Integration App's overview page.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    if (request.body) {
      // POST /jobs/create, /jobs/parse, /jobs/start, /jobs/delete: the key is
      // a field inside the JSON body, not a query parameter — see
      // `lib/client.ts`'s module doc.
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      payload.key = apiKey;
      request.body = JSON.stringify(payload);
      request.headers["content-type"] = "application/json";
      return request;
    }
    const url = new URL(request.url);
    url.searchParams.set("key", apiKey);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const url = new URL(`https://${HOST}${BASE_PATH}/account/info`);
    url.searchParams.set("key", apiKey);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: { status?: string; message?: string } | null = null;
    try {
      body = JSON.parse(text) as { status?: string; message?: string };
    } catch {
      // Not JSON — fall through to the status-based message below.
    }

    if (body && typeof body.status === "string") {
      if (body.status === "success") return { ok: true };
      // `general_failure` / `temp_unavail` / `throttle_triggered` / `bad_referrer`
      // are documented failure modes that are not necessarily about THIS
      // credential's validity, but the probe still couldn't confirm liveness —
      // `auth_failure` is the one that specifically means "invalid API key".
      // The status word is always included so the two cases stay
      // distinguishable even when the vendor's own `message` is generic.
      return {
        ok: false,
        message: body.message
          ? `NeverBounce returned status "${body.status}": ${body.message}`
          : `NeverBounce returned status "${body.status}"`,
      };
    }
    return { ok: false, message: `NeverBounce returned ${res.status}: ${text || res.statusText}` };
  },
};

export default apiKey;
