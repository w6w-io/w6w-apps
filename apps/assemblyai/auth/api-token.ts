import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * AssemblyAI API key — a single, unprefixed `Authorization: <key>` header.
 *
 * Verified against AssemblyAI's own OpenAPI security scheme
 * (`components.securitySchemes.ApiKey`: `{"type": "apiKey", "in": "header",
 * "name": "Authorization"}` — no `Bearer`/other prefix) and live probes against
 * `api.assemblyai.com` on 2026-08-29.
 *
 * ## One key, one account — no scopes to worry about
 *
 * Unlike CloudConvert's six independent API-key scopes (`auth/api-token.ts` in that app
 * documents the resulting "no scope-agnostic probe" problem), an AssemblyAI API key is
 * unscoped: it authenticates the whole account for every endpoint this app calls. So
 * {@link PROBE_PATH} needs no disclosure about which capability it does or doesn't cover.
 *
 * ## No whoami — the probe is a cheap, real read instead
 *
 * AssemblyAI publishes no account/whoami endpoint at all (nothing like Apify's
 * `/v2/users/me/limits` or CloudConvert's `/v2/users/me`), so there is no way to confirm
 * "who does this belong to" for the connection label. `test` instead probes
 * `GET /v2/transcript?limit=1` — cheap (bounded at one result), read-only, and needs no
 * capability a transcription-focused key could plausibly lack. `afterConnect` is omitted
 * for the same reason: there is no field to publish that isn't already the account itself.
 *
 * ## A 401 is not always "bad key" — AssemblyAI's own docs say so
 *
 * AssemblyAI's error-handling reference lists THREE causes for a `401`: "Missing/invalid
 * Authorization, disabled account, or insufficient balance." Unlike a typical
 * wrong-credential 401, this account has no API-readable balance endpoint (see
 * `health/quota.ts`), so `test`'s failure message says so rather than pointing only at the
 * key — a correctly-copied key on a zero-balance account would otherwise get a misleading
 * "check your key" message.
 */

export interface AssemblyAiCredential {
  apiKey: string;
}

/** The one place the wire format is built — `test` and `sign` both reuse it. */
export function authHeaders(credential: Partial<AssemblyAiCredential>): Record<string, string> {
  return { authorization: credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /v2/transcript?limit=1`.
 *
 * Chosen over the alternatives by reading the response, not just guessing:
 *
 *  - There is **no unauthenticated, no-op endpoint** to hit instead — every documented
 *    path under `/v2/transcript` and `/v2/upload` requires the same single API key.
 *  - `limit=1` keeps the response small on an account with a long transcript history; the
 *    response is a list of transcript summaries (`id`, `status`, timestamps, `audio_url`),
 *    never a secret.
 */
export const PROBE_PATH = "/transcript";

/**
 * Measured live on 2026-08-29: an unauthenticated `GET /v2/transcript` and one carrying a
 * syntactically-plausible but fake key both answer the **identical**
 * `401 {"error":"Authentication error, API token missing/invalid"}`. AssemblyAI does not
 * tell a missing credential apart from a wrong one, so `test` below does not try to either.
 */
export const AUTH_ERROR_SNIPPET = "API token missing/invalid";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from your AssemblyAI dashboard (assemblyai.com/dashboard).",
  apiKey: { in: "header", name: "authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "assemblyai.com/dashboard/home — the API key is generated automatically for every " +
        "account and shown at the top of the Overview page.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<AssemblyAiCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<AssemblyAiCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey }) } },
    );
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { error?: string } | null;

    if (res.status === 401) {
      return {
        ok: false,
        message: "AssemblyAI returned 401. Per AssemblyAI's own docs this means one of three " +
          "things: the key was mistyped/rotated, the account is disabled, or the account's " +
          "prepaid balance has run out (assemblyai.com/dashboard has no API-readable balance " +
          "endpoint this check can distinguish it from) — check the key first, then the " +
          "dashboard's Billing page.",
      };
    }
    return {
      ok: false,
      message: `AssemblyAI returned HTTP ${res.status} for GET /v2/transcript${
        body?.error ? `: ${body.error}` : ""
      }`,
    };
  },
};

export default apiToken;
