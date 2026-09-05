import type { AuthDefinition } from "@w6w/types";
import { API_URL, TOKEN_URL } from "../lib/client.ts";

/**
 * Pipefy Service Account (`custom`) — the vendor's own recommended,
 * long-term method: "Service Accounts are the recommended and long-term
 * secure method for integrations, while Personal Access Tokens (PATs) are
 * deprecated and should no longer be used" (Pipefy's Authentication page).
 *
 * A Service Account is created under Organization → Members and Permissions
 * → Service Accounts, which hands back a Client ID, a Client Secret, and
 * "the token endpoint" — Pipefy's own docs present that endpoint as if it
 * were per-account, but it isn't: `https://app.pipefy.com/oauth/token`
 * answers the standard OAuth2 `invalid_client` shape unauthenticated (a
 * Doorkeeper-style token endpoint, not a 404), and the `www-authenticate:
 * Bearer realm="Doorkeeper"` header on a rejected GraphQL call names the
 * same engine — so this is one fixed endpoint, and only the credentials
 * differ per account. See `lib/client.ts`'s `TOKEN_URL` comment.
 *
 * `type: "custom"` rather than `"oauth2"`: the `oauth2` type in this spec
 * models the browser authorization-code flow (`authorizationUrl` + PKCE);
 * this is the machine-to-machine `client_credentials` grant, with no browser
 * round-trip, so it keeps working in scheduled and background runs — same
 * shape as this pack's PayPal/Auth0/Vanta client-credentials auth methods.
 *
 * A Service Account's token expiry (5 minutes to 30 days) is fixed by an
 * organization admin when the account is created and cannot be changed
 * afterward; `refresh` re-runs the same grant regardless of what that
 * window was.
 */
async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }).toString(),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Pipefy token request failed (${res.status}): ${
        body.error_description ?? body.error ?? "no token"
      }`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // A minute of headroom absorbs clock skew regardless of the account's
    // configured expiry window (5 minutes to 30 days per Pipefy's own docs).
    expiresAt: body.expires_in
      ? new Date(Date.now() + Math.max(body.expires_in - 60, 0) * 1000).toISOString()
      : undefined,
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Service Account",
  description: "Create a Service Account under your organization's Members and Permissions → " +
    "Service Accounts, then paste its Client ID and Client Secret. No browser sign-in, " +
    "so it keeps working in scheduled runs. Pipefy's recommended method — Personal " +
    "Access Tokens are deprecated.",
  fields: [
    { key: "clientId", label: "Client ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
  ],

  /** Turns the pasted values into a live token at connect time. */
  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return mintToken(ctx, { clientId, clientSecret });
  },

  /** Same grant again — the client id/secret never expire, only the token does. */
  refresh({ credential }, ctx) {
    const { clientId, clientSecret } = credential as { clientId: string; clientSecret: string };
    return mintToken(ctx, { clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Re-runs the exact same client-credentials grant, then confirms the
   * minted token is actually accepted by the GraphQL endpoint with a `me`
   * query — a Service Account can mint a syntactically valid token that is
   * still scoped to nothing, and `me` needs no scope beyond "is logged in".
   */
  async test({ credential }, ctx) {
    const { clientId, clientSecret } = credential as {
      clientId?: string;
      clientSecret?: string;
    };
    if (!clientId || !clientSecret) {
      return { ok: false, message: "credential missing clientId or clientSecret — reconnect" };
    }
    let accessToken: string;
    try {
      ({ accessToken } = await mintToken(ctx, { clientId, clientSecret }) as {
        accessToken: string;
      });
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query: "{ me { id } }" }),
    });
    const body = await res.json().catch(() => ({})) as {
      data?: { me?: { id?: string } | null };
      errors?: Array<{ message?: string; title?: string; detail?: string }>;
    };
    if (body.errors?.length) {
      const e = body.errors[0];
      return { ok: false, message: e.message ?? e.title ?? "Pipefy rejected the credential" };
    }
    if (!res.ok) return { ok: false, message: `Pipefy returned ${res.status}` };
    if (!body.data?.me?.id) return { ok: false, message: "Pipefy returned no user" };
    return { ok: true };
  },
};

export default clientCredentials;
