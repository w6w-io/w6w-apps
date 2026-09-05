import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Recruitee personal API token — `Authorization: Bearer <token>`.
 *
 * ## Verified live, not just from the doc
 *
 * `curl https://api.recruitee.com/c/1/candidates` with no header answers
 * `401` with `www-authenticate: Bearer realm="recruitee"` and
 * `{"error":"Resource access requires authentication!","error_code":null}`; with
 * `Authorization: Bearer faketoken123` it instead answers
 * `www-authenticate: Bearer realm="recruitee", error="invalid_token",
 * error_description="Token not found."` and
 * `{"error":"Token not found.","error_code":"invalid_token"}` (measured
 * 2026-09-05). That is a standard RFC 6750 bearer challenge — no cookie, no
 * CSRF token — which is what justifies treating this as the credential
 * mechanism a third-party integration is meant to use, rather than trusting
 * the vendor's auto-generated doc (see `lib/client.ts` for why that doc alone
 * is not enough).
 *
 * ## Company ID, not just a token
 *
 * Every resource this app calls is scoped under `/c/{company_id}/...` — the
 * numeric id from the account's own Recruitee URL (Settings → Company). It is
 * not secret, but the API cannot work without it, so — exactly as
 * `packages/apps/apps/freshdesk` collects a `domain` — it is collected here as
 * a connect-time field and echoed onto the Connection's display data by
 * `afterConnect`, where `lib/client.ts` reads it. It is never accepted as an
 * Action param (that would let a workflow silently redirect a call at a
 * different company than the one that was connected).
 */

export interface RecruiteeCredential {
  apiToken: string;
  companyId: string | number;
}

/** The one place the wire format is built, shared by `sign`, `test` and `afterConnect`. */
export function authHeaders(credential: Partial<RecruiteeCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * `GET /c/{company_id}/admin` — "Get current admin and all associated
 * companies" for the *company-scoped* form (distinct from the un-scoped
 * `GET /admin`, whose own doc text says to use HTTP Basic with an account
 * email + password — a different, legacy mechanism this app does not use).
 *
 * Chosen as the probe because it needs no ability beyond "who am I": no
 * resource id, no admin-only scope, and — measured live — it answers the
 * identical bearer challenge as the resource endpoints. Its response is the
 * calling admin's own id, email, role, and `role_abilities` (a permission
 * list) — account metadata, not a secret the app would have to strip before
 * ever returning it as `afterConnect` display data.
 */
export const PROBE_PATH = "/admin";

interface AdminResponse {
  admin?: {
    id?: number;
    email?: string;
    membership?: { role?: string };
  };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a personal API token from Recruitee > Settings > Apps and plugins > Personal API " +
    "tokens, plus the numeric Company ID shown in your Recruitee account's own URL.",
  connectionLabel: "Recruitee ({{email}})",
  fields: [
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      required: true,
      placeholder: "123",
      hint: "The numeric company id from your Recruitee account (Settings > Company, or the " +
        "number in api.recruitee.com/c/<id>/... links).",
      validation: { pattern: "^[0-9]+$" },
    },
    {
      key: "apiToken",
      label: "Personal API Token",
      type: "secret",
      required: true,
      hint: "Settings > Apps and plugins > Personal API tokens.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The company id never needs to be
   * here — it lives in the request path, built by the client from `display`.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<RecruiteeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<RecruiteeCredential>;
    const token = String(cred?.apiToken ?? "").trim();
    const companyId = String(cred?.companyId ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };
    if (!companyId) return { ok: false, message: "credential missing companyId" };

    const res = await ctx.fetch(`${API_BASE}/c/${encodeURIComponent(companyId)}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: string; error_code?: string | null }
      | null;
    const code = body?.error_code;

    if (code === "invalid_token" || res.status === 401) {
      return {
        ok: false,
        message: `Recruitee rejected the token (${res.status}${code ? ` ${code}` : ""}). Check ` +
          "it was copied exactly from Settings > Apps and plugins > Personal API tokens, and " +
          "that it has not been revoked.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `Recruitee found no company ${companyId} (404). Check the Company ID matches ` +
          "the account this token belongs to.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Recruitee refused the admin-identity read (403${code ? ` ${code}` : ""})` +
          `${body?.error ? `: ${body.error}` : ""}`,
      };
    }
    return { ok: false, message: `Recruitee returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish the company id (needed by every Action) and, when available, the
   * calling admin's own email for the connection label. Nothing else off this
   * response is kept — `role_abilities` is a long permission list with no
   * display value, and dropping it here is simpler than dropping it per-field
   * later.
   *
   * A failure here is deliberately silent about the email/role half: `test`
   * has already established the token is live, so a missing display label
   * must not fail an otherwise-good Connection. The company id is always
   * recorded, because without it no Action can build a request path at all.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<RecruiteeCredential>;
    const companyId = String(cred?.companyId ?? "").trim();
    try {
      const res = await ctx.fetch(`${API_BASE}/c/${encodeURIComponent(companyId)}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return { companyId };
      const body = await res.json() as AdminResponse;
      const email = body?.admin?.email;
      const role = body?.admin?.membership?.role;
      return email ? { companyId, email, role } : { companyId };
    } catch {
      return { companyId };
    }
  },
};

export default apiToken;
