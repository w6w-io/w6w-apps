import type { AuthDefinition } from "@w6w/types";
import { BASE_URL, LEGACY_BASE_URL } from "../lib/client.ts";

/**
 * Formstack **Personal Access Token** — `Authorization: Bearer …`.
 *
 * ## Which credential this is, and which it is not
 *
 * From the vendor's authentication page: "The V2025 API uses **Personal Access
 * Tokens** for authentication … Personal Access Tokens are tied to a Formstack
 * user and follow Formstack (in-app) user permissions."
 *
 * That last clause matters more than it looks. The token inherits the *person's*
 * permissions, so a connection made with a limited user's token can see fewer
 * forms than an admin expects — and that is the correct behaviour, not a bug to
 * work around. It also means the token is only as narrow as the user it belongs
 * to; a dedicated integration user is the way to scope one down.
 *
 * The older `/api/v2` generation used OAuth2 and app tokens instead. Those
 * credentials do **not** work here, and vice versa: both bases are live and both
 * answer `401` rather than `404` to an unauthenticated call, so a mix-up
 * presents as a rejected token rather than a wrong URL. `test` says so.
 *
 * ## Why there is nothing else on the Connection
 *
 * One fixed host, one credential, no account or region selector — Formstack is
 * SaaS-only on a single domain. The manifest names `www.formstack.com` exactly
 * rather than widening to a wildcard.
 */

export interface FormstackCredential {
  accessToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does.
 */
export function authHeaders(credential: Partial<FormstackCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

/** The probe. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_PATH = "/forms";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Create a Personal Access Token in Formstack (Account → Personal Access Tokens). It inherits " +
    "the permissions of the user it belongs to, so a dedicated integration user is the way to " +
    "scope one down.",
  connectionLabel: "Formstack ({{account.forms}} form(s))",
  fields: [
    {
      key: "accessToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint:
        "A V2025 token. Credentials from the older /api/v2 generation — OAuth2 tokens and app " +
        "tokens — are not interchangeable with these.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the bearer header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<FormstackCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /forms?pageSize=1` is the probe.
   *
   * Formstack's V2025 surface has no whoami endpoint at all, so the choice is
   * among ordinary resource reads — and the forms list is the right one: it is
   * the account's own top-level resource, every token that can do anything can
   * read it, and its response contains **no credential material**, which is what
   * disqualifies `/me`-shaped probes elsewhere in this pack.
   *
   * `pageSize=1` keeps the probe cheap on an account with thousands of forms.
   *
   * An empty account is deliberately **not** treated as a failure: a token that
   * authenticates against an account with no forms yet is perfectly valid, and
   * calling that broken would block a first-run setup. That is the opposite call
   * from `apps/baserow`, where a database token that can reach no tables is
   * genuinely useless — the difference is that Baserow's token is *scoped* to
   * tables, while this one is not scoped to forms.
   *
   * A `429` at connect time is reported as the daily quota rather than as a bad
   * token, because Formstack's limit is a per-day allowance and "try again in a
   * moment" would be wrong advice.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<FormstackCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${BASE_URL}${PROBE_PATH}?pageSize=1`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message:
          `Formstack rejected the token (${res.status}). Check it is a V2025 Personal Access ` +
          `Token — a credential for the older ${LEGACY_BASE_URL} generation is not valid here.`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message:
          "This token's daily API quota is exhausted, so the credential cannot be verified right " +
          "now. The window is a day and varies by plan.",
      };
    }
    if (!res.ok) return { ok: false, message: `Formstack returned HTTP ${res.status}` };

    // A 200 that is not a forms payload means something else answered on this
    // origin — a login page or an edge cache, both of which return HTML.
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return {
        ok: false,
        message: "Host answered but did not return a Formstack response — is this token for V2025?",
      };
    }
    return { ok: true };
  },

  /**
   * Records how many forms the token can see, so a Connection carries something
   * recognisable without either the token or the customers' form names being
   * republished.
   *
   * A count is the whole label: form names are the customer's own content, and a
   * display block is shown wherever the Connection is.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<FormstackCredential>;
    if (!cred?.accessToken) return {};

    const res = await ctx.fetch(`${BASE_URL}${PROBE_PATH}?pageSize=1`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as
      | { total?: number; totalRecords?: number; data?: unknown[] }
      | null;
    // Formstack's list envelopes have carried both spellings of the total across
    // generations; neither is guaranteed, so the count is best-effort.
    const forms = body?.total ?? body?.totalRecords ??
      (Array.isArray(body?.data) ? body.data.length : undefined);
    return forms === undefined ? {} : { account: { forms } };
  },
};

export default accessToken;
