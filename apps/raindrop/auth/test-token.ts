import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { classifyProbe, PROBE_PATH } from "./probe.ts";

/**
 * Raindrop **test token** — `Authorization: Bearer <token>`.
 *
 * Verified against `developer.raindrop.io/v1/authentication/token` and
 * `.../calls`, plus live probes against `api.raindrop.io` on 2026-08-11.
 *
 * ## What this is, and why it is a first-class method rather than a shortcut
 *
 * Raindrop's App Management Console issues every registered application a
 * permanent **test token** alongside its OAuth client credentials. The vendor's
 * own guidance: "If you just want to test your application, or do not plan to
 * access any data except yours account you don't need to make all of those
 * steps. Just go to App Management Console and open your application settings.
 * Copy Test token."
 *
 * Two properties make it the right default for a workflow host:
 *
 *  - **It does not expire.** Ordinary OAuth access tokens are documented to
 *    "expire after two weeks"; the reference exempts test tokens explicitly
 *    ("except 'test tokens'"). A scheduled workflow that runs monthly therefore
 *    works with this method and needs a live refresh path with the other one.
 *  - **It needs no redirect URL, no client secret and no browser round trip** —
 *    one field, pasted.
 *
 * Its limit is equally sharp and is stated in the field hint: the token is bound
 * to **the account that owns the application registration**. It cannot be used
 * to act for anyone else, so a multi-user integration needs `auth/oauth2.ts`.
 *
 * ## Header only
 *
 * The reference documents exactly one way to present a token — the
 * `Authorization: Bearer` header — and no `?access_token=` query form. Nothing
 * in this app puts a credential in a URL.
 */

export interface TestTokenCredential {
  testToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<TestTokenCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.testToken ?? ""}` };
}

const testToken: AuthDefinition = {
  key: "test-token",
  type: "bearer",
  displayName: "Test Token",
  description:
    "Paste the permanent Test token from your app's page in the Raindrop.io App Management " +
    "Console (raindrop.io > Settings > Integrations > your app). It never expires, but it acts " +
    "as the account that owns the app registration — use OAuth to connect anyone else.",
  connectionLabel: "Raindrop.io ({{fullName}})",
  fields: [
    {
      key: "testToken",
      label: "Test Token",
      type: "secret",
      required: true,
      hint: "raindrop.io > Settings > Integrations > (your app) > Test token. It authenticates " +
        "as the app owner's own account and does not expire. Create a dedicated app " +
        "registration for this connection rather than reusing one shared with other services.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the bearer header and returns. The token never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<TestTokenCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See `auth/probe.ts` for why this endpoint, and why the body decides. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TestTokenCredential>;
    const token = (cred?.testToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing testToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ testToken: token }) },
    });
    const body = await res.json().catch(() => null);
    return classifyProbe(res.status, body, "test token");
  },

  /**
   * Publish the account's display name, and nothing else that identifies a
   * person.
   *
   * `GET /rest/v1/user` returns the account's `email` alongside `fullName`, and
   * a Connection label is rendered in lists, logs and previews — so this hook
   * takes the two fields it needs off the response and drops the rest on the
   * floor rather than publishing the whole user object and hoping nothing reads
   * it. `email`, `config`, `groups` and the linked-social flags never leave this
   * function.
   *
   * A failure here is deliberately silent: `test` has already established the
   * token is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TestTokenCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/user`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { user?: { fullName?: string; _id?: number } };
      const fullName = body?.user?.fullName;
      const userId = body?.user?._id;
      if (!fullName) return {};
      return userId ? { fullName, userId } : { fullName };
    } catch {
      return {};
    }
  },
};

export default testToken;
