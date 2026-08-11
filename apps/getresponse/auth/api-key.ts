import type { AuthDefinition } from "@w6w/types";
import { AUTH_PREFIX, baseUrlFor, type GetResponsePlatform } from "../lib/client.ts";

/**
 * GetResponse API key — the `X-Auth-Token` header, with a literal prefix.
 *
 * ## The wire format, from the vendor's own security scheme
 *
 *     "api-key": { "type": "apiKey", "in": "header", "name": "X-Auth-Token",
 *                  "description": "Header value must be prefixed with api-key" }
 *
 * So the header is `X-Auth-Token: api-key <key>`. The prefix is literal and
 * required — omitting it produces `code 1014, "Unsupported authentication
 * method"`, verified live on 2026-08-11, which reads like a wrong key rather
 * than a wrong format. `test` says so explicitly for that reason.
 *
 * A key is created in the GetResponse UI under **Integrations & API → API**.
 *
 * ## The platform is half the credential
 *
 * GetResponse runs three independent platforms with three hosts — retail, MAX US
 * and MAX PL — and an account exists on exactly one. A MAX key is not valid
 * against `api.getresponse.com` and vice versa, so the platform belongs on the
 * Connection next to the key rather than on each action.
 *
 * ## Why not OAuth2
 *
 * The spec also declares OAuth2 with implicit, authorization-code and
 * client-credentials flows, all scoped to a single `all` scope. It is not shipped
 * here for the reason that recurs across this pack: an access token has to be
 * fetched and refreshed, and `sign` is network-less. An API key has no expiry to
 * design around — and GetResponse's OAuth grants only `all` anyway, so it buys
 * no least-privilege benefit over a key the user can revoke.
 */

export interface GetResponseCredential {
  platform: GetResponsePlatform;
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does — a hand-rolled second copy is how a probe ends up
 * sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<GetResponseCredential>): Record<string, string> {
  return { "x-auth-token": `${AUTH_PREFIX}${credential.apiKey ?? ""}` };
}

/** The probe. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_PATH = "/accounts";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key in GetResponse under Integrations & API → API, and pick the platform your " +
    "account is on. MAX accounts use a different host and their keys do not work against the " +
    "retail one.",
  connectionLabel: "{{account.email}}",
  apiKey: {
    in: "header",
    name: "X-Auth-Token",
    prefix: AUTH_PREFIX,
  },
  fields: [
    {
      key: "platform",
      label: "Platform",
      type: "select",
      required: true,
      default: "retail",
      options: [
        { value: "retail", label: "GetResponse — api.getresponse.com" },
        { value: "max-us", label: "GetResponse MAX (US) — api3.getresponse360.com" },
        { value: "max-pl", label: "GetResponse MAX (PL) — api3.getresponse360.pl" },
      ],
      hint: "MAX is the enterprise product. If you are not sure, you are on the retail platform.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From Integrations & API → API. Paste the key alone — this app adds the required " +
        "`api-key ` prefix for you.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<GetResponseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /accounts` is the probe.
   *
   * It returns the account that owns the key — `accountId`, `email`,
   * `firstName`, `lastName`, `companyName`, `timeZone`. Read before adoption:
   * there is **no key material in it**, which is the concern that disqualifies
   * `/me`-shaped endpoints elsewhere in this pack (Follow Up Boss's `/me`
   * returns the caller's own API key; Wufoo's `users.json` returns every user's).
   *
   * It also needs no permission beyond the key existing, and it is the only
   * endpoint that confirms *both* halves of this credential at once: a retail
   * key against a MAX host fails here rather than at the first real call.
   *
   * Error codes are distinguished because GetResponse's are specific and
   * actionable — `1014` is an authentication problem, and its `message` says
   * whether the header was malformed or the key was rejected.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GetResponseCredential>;
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };

    const base = baseUrlFor(cred.platform);
    const res = await ctx.fetch(`${base}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.ok) {
      // A 200 that is not an account record means something else answered.
      const account = await res.json().catch(() => null) as { accountId?: string } | null;
      if (!account || typeof account.accountId !== "string") {
        return {
          ok: false,
          message: "Host answered but did not return a GetResponse account.",
        };
      }
      return { ok: true };
    }

    const body = await res.json().catch(() => null) as
      | { code?: number; message?: string; codeDescription?: string }
      | null;

    if (body?.code === 1014 || res.status === 401) {
      const detail = body?.message ?? body?.codeDescription ?? "";
      return {
        ok: false,
        message:
          `GetResponse rejected the credential (${res.status}${
            body?.code ? ` code ${body.code}` : ""
          })${detail ? `: ${detail}` : ""}. Check the key, and that the platform matches the ` +
          "account — a MAX key does not work against the retail host, or the other way round.",
      };
    }
    if (body?.code === 1015 || res.status === 429) {
      return {
        ok: false,
        message: "GetResponse is throttling this key right now (code 1015). Try again shortly.",
      };
    }
    return { ok: false, message: `GetResponse returned HTTP ${res.status}` };
  },

  /**
   * Records the platform — so the client can pick the right host — and enough of
   * the account to label the Connection.
   *
   * The account's `email` and `companyName` are published because they are how a
   * person recognises which GetResponse account a Connection points at, and
   * because the account record is the connection's own, not a third party's.
   * Nothing else from it is, and the key never is.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<GetResponseCredential>;
    if (!cred?.apiKey) return {};
    const platform: GetResponsePlatform = cred.platform ?? "retail";

    const display: Record<string, unknown> = { platform };
    const res = await ctx.fetch(`${baseUrlFor(platform)}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const account = await res.json().catch(() => ({})) as {
        accountId?: string;
        email?: string;
        companyName?: string;
      };
      display.account = {
        id: account.accountId,
        email: account.email,
        company: account.companyName,
      };
    }
    return display;
  },
};

export default apiKey;
