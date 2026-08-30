import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Wave's "Full access token" — a static bearer token generated from the
 * Manage Applications page in Wave's Developer Portal.
 *
 * This is a genuinely documented, first-class alternative to OAuth 2, not a
 * workaround: Wave's own "3 - Authentication" article names both paths side
 * by side and says exactly when each applies — "Use Full Access if you're
 * creating an app just for yourself, or if you don't have a Pro account. Use
 * OAuth 2 if you have a Pro account, or you want to create an app for
 * multiple users." It also warns explicitly: "For any applications that will
 * be published or sold for other Wave users to access their accounts,
 * authentication must be via OAuth 2" — this method is for a self-hosted w6w
 * install reaching the operator's OWN Wave account(s), never for a Connection
 * offered to a third party.
 *
 * The doc's own words are blunter still: "Your Access Token provides full
 * access to all businesses in your Wave account, not just your test
 * account." There is no scoping at all on this token — it is the same
 * permission level as the underlying Wave user account — which is the other
 * reason OAuth 2 (scoped, per-business, revocable independently) is the right
 * choice for anything multi-tenant.
 */
const fullAccessToken: AuthDefinition = {
  key: "full-access-token",
  type: "bearer",
  displayName: "Full Access Token",
  description:
    "A static token generated from Manage Applications in Wave's Developer Portal. Grants full access to every business in the underlying Wave account — use only for a personal or single-operator install, never for a Connection offered to other Wave users.",
  fields: [
    {
      key: "token",
      label: "Full Access Token",
      type: "secret",
      required: true,
      hint:
        "Generated on the application's page under Manage Applications at developer.waveapps.com.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * Same probe as the OAuth method: `{ user { id defaultEmail } }`. Checked on
   * both channels — Wave's documented "Login Required" failure is HTTP 200
   * with `errors[{ extensions: { code: "UNAUTHENTICATED" } }]`, not a 401.
   */
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query: "{ user { id defaultEmail } }" }),
    });

    const body = await res.json().catch(() => ({})) as {
      data?: { user?: { id?: string } | null };
      errors?: Array<{ message?: string }>;
    };
    if (body.errors?.length) {
      return { ok: false, message: body.errors[0]?.message ?? "Wave rejected the credential" };
    }
    if (!res.ok) return { ok: false, message: `Wave returned ${res.status}` };
    if (!body.data?.user?.id) return { ok: false, message: "Wave returned no user" };
    return { ok: true };
  },
};

export default fullAccessToken;
