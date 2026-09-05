import type { AuthDefinition, HookContext } from "@w6w/types";
import { errorMessage, normalizeSchoolDomain } from "../lib/client.ts";

/**
 * OAuth2 **client credentials** grant against a school's own
 * `/admin/api/oauth2/access_token` endpoint.
 *
 * ## What LearnWorlds actually offers, and why this one
 *
 * LearnWorlds' help center ("How to Request your API Keys and Access
 * Tokens") describes requesting a Client ID and Client Secret from
 * Settings → Developers → API — available only on the Learning Center and
 * High Volume & Corporate plans, and only for API v2 (v1 is retired). The
 * spec's own "Required Headers" section requires exactly this pair
 * (`client_id`/`client_secret`, `grant_type: "client_credentials"`) to mint a
 * bearer token, which is the machine-to-machine shape an unattended workflow
 * needs — there is no browser login step, and the credential is independently
 * revocable and re-mintable from the same screen without touching a real
 * LearnWorlds user's own password.
 *
 * ## `type: "custom"`, not `"oauth2"`
 *
 * The `oauth2` type in this spec models a browser authorization-code flow
 * against a **fixed** `authorizationUrl`/`tokenUrl`. LearnWorlds is
 * multi-tenant SaaS where every school has its own subdomain (or a fully
 * custom domain) and the token endpoint lives on THAT domain — neither URL is
 * fixed, and this grant has no redirect step to model regardless. `exchange`
 * and `refresh` mint by hand against `{schoolOrigin}/admin/api/oauth2/access_token`.
 *
 * ## No refresh token, and a header the token exchange itself requires
 *
 * The client-credentials response carries only `tokenData.access_token`,
 * `tokenData.token_type` and `tokenData.expires_in` — no refresh token (that
 * only exists for the password grant this app does not implement) — so
 * `refresh` just re-runs the same exchange, the same fallback `mautic`'s
 * client-credentials auth uses.
 *
 * Unlike most OAuth2 token endpoints, LearnWorlds requires its own
 * `Lw-Client` header (the client id) on the *token request itself*, not just
 * on every authenticated call after it — confirmed live: an unsigned POST to
 * a real school's token endpoint with a correct JSON body but no `Lw-Client`
 * header answers `400 {"context":"client_id","message":"Missing client_id or
 * client cannot be found."}`. Skip that header here and every connection
 * attempt fails with a message that looks like a bad client id, not a missing
 * header.
 */

interface TokenResponse {
  tokenData?: { access_token?: string; token_type?: string; expires_in?: number };
  errors?: Array<{ code?: number | string | null; context?: string | null; message?: string }>;
  success?: boolean;
}

/** What this app persists on the Connection. */
export interface LearnWorldsCredential {
  schoolDomain: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  expiresAt?: string;
}

async function requestToken(
  ctx: HookContext,
  origin: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const res = await ctx.fetch(`${origin}/admin/api/oauth2/access_token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "Lw-Client": clientId,
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }

  if (!res.ok || body.success === false || !body.tokenData?.access_token) {
    const detail = errorMessage(text);
    throw new Error(
      `LearnWorlds token request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return body;
}

/**
 * Fold a token response into the stored credential.
 *
 * `expiresAt` lets the host refresh *before* LearnWorlds starts answering
 * 401. The 60-second haircut absorbs clock skew between this host and
 * LearnWorlds regardless of the token's real lifetime.
 */
function foldToken(
  base: { schoolDomain: string; clientId: string; clientSecret: string },
  body: TokenResponse,
): LearnWorldsCredential {
  return {
    schoolDomain: base.schoolDomain,
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    accessToken: body.tokenData?.access_token,
    expiresAt: new Date(
      Date.now() + ((body.tokenData?.expires_in ?? 3600) - 60) * 1000,
    ).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "API Credentials (Client Credentials)",
  description:
    "Request a Client ID and Client Secret at Settings → Developers → API in your LearnWorlds " +
    "school, using the Client Credentials grant. This requires the Learning Center or High " +
    "Volume & Corporate plan — API access is not available on Starter or Pro Trainer.",
  connectionLabel: "{{site.host}}",
  fields: [
    {
      key: "schoolDomain",
      label: "School domain",
      type: "string",
      required: true,
      placeholder: "yourschool.learnworlds.com",
      hint: 'Your school\'s own domain, or a connected custom domain. Copy it as the "API URL" ' +
        "shown alongside your keys at Settings → Developers → API.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Settings → Developers → API → Request API keys.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Shown once at request time. Regenerating it invalidates every token minted from it.",
    },
  ],

  /** Turns the pasted client id and secret into a live access token at connect time. */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    const schoolDomain = normalizeSchoolDomain(String(f.schoolDomain ?? ""));
    const body = await requestToken(ctx, schoolDomain, clientId, clientSecret);
    return foldToken({ schoolDomain, clientId, clientSecret }, body);
  },

  /**
   * Re-mint from the stored client id and secret — there is no refresh token
   * for this grant (see the file header), so this is the only path back.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<LearnWorldsCredential>;
    const { schoolDomain, clientId, clientSecret } = cred;
    if (!schoolDomain || !clientId || !clientSecret) {
      throw new Error("credential is missing schoolDomain, clientId or clientSecret — reconnect");
    }
    const body = await requestToken(ctx, schoolDomain, clientId, clientSecret);
    return foldToken({ schoolDomain, clientId, clientSecret }, body);
  },

  /**
   * The only hook that stamps credential-derived headers. Runs network-less.
   * Both headers are required on every call, per the spec's "Required
   * Headers for all requests" section — `Lw-Client` carries the client id,
   * which is part of the credential and therefore off-limits to an Action.
   */
  sign({ request, credential }) {
    const { accessToken, clientId } = credential as Partial<LearnWorldsCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    request.headers["lw-client"] = clientId ?? "";
    return request;
  },

  /**
   * `GET /admin/api/v2/users?items_per_page=1` is the probe. LearnWorlds
   * documents no dedicated ping/whoami endpoint for v2 (checked: the OpenAPI
   * document defines no `/me`, `/whoami` or account-info path), so this is
   * the cheapest read available — a client-credentials grant is trusted as
   * the school itself rather than scoped per-resource, so there is no
   * narrower call that would fail for a differently-reasoned cause.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LearnWorldsCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing an access token" };
    if (!cred?.schoolDomain) return { ok: false, message: "credential missing schoolDomain" };
    if (!cred?.clientId) return { ok: false, message: "credential missing clientId" };

    const res = await ctx.fetch(
      `${cred.schoolDomain}/admin/api/v2/users?items_per_page=1`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${cred.accessToken}`,
          "Lw-Client": cred.clientId,
        },
      },
    );
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `LearnWorlds rejected the token (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). The access token may have expired, or the API credential was regenerated.`,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "LearnWorlds returned 403 — the token authenticated, but the school's plan " +
          "may no longer include API access (Learning Center or High Volume & Corporate is " +
          "required).",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no LearnWorlds school found at ${cred.schoolDomain} (404) — check the school ` +
          "domain.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `LearnWorlds returned ${res.status}${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }`,
      };
    }
    return { ok: true };
  },

  /**
   * Records which school this connection points at, for `connectionLabel`.
   * LearnWorlds documents no whoami endpoint (see `test` above), so there is
   * nothing further to fetch here — the domain is already known from
   * `exchange`, and is never the credential itself.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<LearnWorldsCredential>;
    if (!cred?.schoolDomain) return {};
    return { schoolDomain: cred.schoolDomain, site: { host: cred.schoolDomain } };
  },
  // No `revoke`: LearnWorlds' API documentation exposes no token-revocation
  // endpoint. Regenerating the Client ID/Secret pair in Settings → Developers
  // → API invalidates every token minted from it, but that is the operator's
  // own step in the dashboard, same as Mautic's API Credentials.
};

export default clientCredentials;
