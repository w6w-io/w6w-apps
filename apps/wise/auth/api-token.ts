import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_VERSION, formatWiseError } from "../lib/client.ts";

/**
 * Wise bearer token — `Authorization: Bearer <token>`.
 *
 * Verified against `components.securitySchemes` in Wise's OpenAPI bundle and
 * the personal-API-token guide (`docs.wise.com/guides/developer/auth-and-security/
 * personal-api-token`), both fetched 2026-09-05.
 *
 * ## One header shape, two kinds of token behind it
 *
 * Wise's spec declares three bearer schemes that all use the exact same wire
 * format (`Authorization: Bearer <JWT>`) and differ only in provenance and
 * scope:
 *
 *  - **`PersonalToken`** — "Generated from Wise.com > Settings > Connect and
 *    manage apps > API tokens." The guide is explicit that this is a
 *    **business-account** feature ("Create and use a personal token with a
 *    Wise business account"), not a personal-profile one despite the name, and
 *    that it never expires until revoked.
 *  - **`UserToken`** — an OAuth 2.0 user access token, valid 12 hours,
 *    obtained through a Wise Platform partnership (`registration_code` or
 *    `authorization_code` grant). Out of reach without a partner agreement,
 *    but the wire format is identical, so a caller who already has one can
 *    paste it in here.
 *
 * This app declares one field and one `sign` hook for both, because the
 * runtime cannot and need not distinguish them — Wise's own gateway is what
 * enforces which token type may call which endpoint (see the per-action notes
 * below and the README's auth section for the documented scope split).
 *
 * ## A real, documented inconsistency between the guide and the OpenAPI spec
 *
 * The personal-token guide states a personal token covers "creating quotes,
 * retrieving and creating recipients, creating transfers and batch groups, and
 * tracking transfer events" — and its own worked example authenticates a
 * `GET /profiles` call, which is not on that list. The OpenAPI bundle's
 * per-operation `security` array, however, declares `quoteCreate`,
 * `recipientCreate`, `recipientList` and `recipientGet` as **`UserToken`
 * only** (no `PersonalToken` entry at all) — while `security` on `/profiles`,
 * `/transfers`, `/profiles/{id}/balances` and `/rates` lists both. Both
 * documents come from `docs.wise.com` and were read on the same day; this is
 * not a guess, it is a discrepancy in Wise's own current documentation, kept
 * here rather than silently resolved one way. A personal-token connection
 * that gets a scope-shaped 403 on `quote-create` or any `recipient-*` action
 * is hitting exactly this gap — see the README.
 */

export interface WiseCredential {
  apiToken: string;
}

/** The one place the wire format is built, shared with `test` so no second copy can drift. */
export function authHeaders(credential: Partial<WiseCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * `GET /profiles` is the probe, and it was picked by reading the guide, not by
 * guessing a whoami:
 *
 *  - It is the **personal-API-token guide's own worked example** of "using a
 *    personal API token" — the vendor's own canonical smoke test.
 *  - It answers **no credential material at all**: a `Profile` is `{id, type,
 *    ...}` name/address fields for the caller's own identity, not a secret.
 *  - Verified live 2026-09-05: no header answers `401 missing_token`; a
 *    syntactically-plausible garbage bearer answers `401 invalid_token`. Both
 *    require a credential to get past, which rules out the `GET /currencies`
 *    trap — that endpoint is fully public (confirmed live: `200` with no
 *    `Authorization` header at all), so a Connection whose token never got
 *    attached would sail through a probe against it.
 */
export const PROBE_PATH = "/profiles";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a Personal API Token from a Wise business account (Wise.com > Settings > Connect and " +
    "manage apps > API tokens), or an OAuth user access token if you hold a Wise Platform " +
    "partnership. See this app's README for which actions each token type can reach.",
  connectionLabel: "Wise ({{profileType}} #{{profileId}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Wise.com > Settings > Connect and manage apps > API tokens. Personal API tokens " +
        "remain active until revoked from the same screen.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<WiseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<WiseCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}/${API_VERSION}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let code: string | undefined;
    try {
      code = (JSON.parse(raw) as { error?: string }).error;
    } catch { /* not JSON */ }

    if (code === "missing_token") {
      return {
        ok: false,
        message: "Wise received no token. The credential did not reach the request — reconnect " +
          "this connection.",
      };
    }
    if (code === "invalid_token" || res.status === 401) {
      return {
        ok: false,
        message: `Wise rejected the token (${res.status}${code ? ` ${code}` : ""}). Check it was ` +
          "copied exactly and has not been revoked from Wise.com > Settings > Connect and manage " +
          "apps > API tokens.",
      };
    }
    return { ok: false, message: formatWiseError(res.status, "GET", PROBE_PATH, raw) };
  },

  /**
   * Publish which profile this token acts as, and nothing else.
   *
   * `GET /profiles` is the same endpoint `test` already proved live, so this
   * makes no extra claim about what the token can reach. It picks the first
   * PERSONAL profile if one exists (the common case), else the first profile
   * of any type — and keeps only `id` and `type`, never the address/legal
   * fields a Profile also carries.
   *
   * A failure here is deliberately silent: `test` already established the
   * token is live, and a missing display label must not fail a good Connection.
   *
   * Like `test`, this builds its own `Authorization` header rather than going
   * through a request helper: `sign` has not run yet during connect (there is
   * no stored Connection to sign for), so the raw credential this hook
   * receives must be attached by hand — exactly as `test` does above.
   */
  async afterConnect({ credential }, ctx) {
    try {
      const cred = credential as Partial<WiseCredential>;
      const res = await ctx.fetch(`${API_BASE}/${API_VERSION}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const profiles = await res.json() as Array<{ id?: number; type?: string }>;
      const chosen = profiles.find((p) => p.type === "PERSONAL") ?? profiles[0];
      if (!chosen?.id) return {};
      return { profileId: chosen.id, profileType: chosen.type ?? "profile" };
    } catch {
      return {};
    }
  },
};

export default apiToken;
