import type { AuthDefinition } from "@w6w/types";
import { hostFor, regionFor, REGIONS } from "../lib/client.ts";

/**
 * OAuth 2.0 client-credentials against Zuora's `POST /oauth/token` — verified
 * 2026-09-05 against `developer.zuora.com/v1-api-reference/api/oauth/createtoken`
 * and the "OAuth" get-started page it links from.
 *
 * ## Not the authorization-code flow
 *
 * There is no browser redirect: an OAuth client (client id + secret) is
 * created once in the Zuora UI (Administration → Manage Users, or Platform →
 * OAuth Clients depending on tenant version), and this app exchanges that pair
 * directly for a bearer token — the same machine-to-machine shape as this
 * pack's `vanta` app, which is why this method is `type: "custom"` rather than
 * `"oauth2"` (that type models the browser authorization-code dance this API
 * doesn't have).
 *
 * ## The request is FORM-encoded, not JSON — and sets no auth header
 *
 * `application/x-www-form-urlencoded` with `client_id` / `client_secret` /
 * `grant_type=client_credentials`. Zuora's own doc adds: "do not set any
 * authentication headers such as Authorization, apiAccessKeyId, or
 * apiSecretAccessKey" on this call — sending stale credentials alongside the
 * form body is a documented way to break the exchange.
 *
 * ## The token endpoint is rate limited BY IP ADDRESS, separately from everything else
 *
 * Zuora: "You should not use this operation to generate a large number of
 * bearer tokens in a short period of time; each token should be used until it
 * expires." The Rate Limits guide gives the actual numbers: AUTH requests are
 * capped at 2,000/minute per tenant but only **100/minute per IP address** —
 * far tighter than the 50,000/minute general API limit, and a limit that bites
 * a shared outbound IP (a NAT gateway, a serverless platform) long before any
 * per-tenant ceiling does. This app mints a token once in `exchange` and again
 * only in `refresh`, on a floor of expiry minus a minute of headroom — never
 * per request.
 *
 * ## No refresh token — `refresh` just mints a new one
 *
 * The client-credentials grant returns only `access_token` + `expires_in` (no
 * `refresh_token`), so `refresh` here is `exchange` again with the same id and
 * secret, exactly like `vanta`'s pattern.
 */

const TOKEN_TTL_HEADROOM_SECONDS = 60;

async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { region?: string; clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const region = String(creds.region ?? "us-cloud2");
  const host = hostFor(region);

  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const res = await ctx.fetch(`${host}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form.toString(),
  });
  const text = await res.text().catch(() => "");
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok || typeof body.access_token !== "string") {
    const reason = (body.error_description as string | undefined) ??
      (body.error as string | undefined) ??
      `HTTP ${res.status}`;
    throw new Error(
      `Zuora refused to mint a token (${reason}). Check the client id and secret, and that this ` +
        "region matches the data centre the OAuth client was created in — a client from one " +
        "Zuora cloud/region is unknown to another.",
    );
  }

  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3600;
  return {
    ...creds,
    region,
    accessToken: body.access_token,
    expiresAt: new Date(
      Date.now() + Math.max(0, expiresIn - TOKEN_TTL_HEADROOM_SECONDS) * 1000,
    ).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "OAuth Client (Client Credentials)",
  description: "A Zuora OAuth client's id and secret, exchanged for a short-lived bearer token. " +
    "Create the OAuth client in the Zuora UI first — see this app's README.",
  connectionLabel: "Zuora ({{regionLabel}})",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
    },
    {
      key: "region",
      label: "Zuora Environment",
      type: "select",
      required: true,
      default: "us-cloud2",
      options: REGIONS.map((r) => ({ value: r.key, label: `${r.label} — ${r.apiHost}` })),
      hint: "Must match the data centre this OAuth client was created in — a credential from " +
        "one Zuora region/cloud is unknown to another. If unsure, check the tenant's login URL " +
        'or ask a Zuora admin; see the README\'s "Which environment?" section.',
    },
  ],

  exchange({ fields }, ctx) {
    const { clientId, clientSecret, region } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    // Fail here, with an explanation, rather than at the sandbox's egress check.
    hostFor(region);
    return mintToken(ctx, { clientId, clientSecret, region });
  },

  refresh({ credential }, ctx) {
    const { clientId, clientSecret, region } = credential as Record<string, string>;
    return mintToken(ctx, { clientId, clientSecret, region });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /object-query/accounts?pageSize=1` — the cheapest authenticated call
   * this API has. It needs no object to exist (an empty tenant answers
   * `{"data": []}` with a 200) and no scope beyond a base read grant, unlike
   * most `/v1/*` endpoints which need a specific object key.
   */
  async test({ credential }, ctx) {
    const cred = credential as { accessToken?: string; region?: string };
    const accessToken = (cred?.accessToken ?? "").trim();
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const host = hostFor(cred.region);

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/object-query/accounts?pageSize=1`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true };
    }

    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: "Zuora rejected the bearer token (401) — it may have expired, or the OAuth " +
          "client may have been deactivated.",
      };
    }
    return {
      ok: false,
      message: `Zuora returned HTTP ${res.status} for /object-query/accounts: ${
        text.slice(0, 300)
      }`,
    };
  },

  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: region ?? "us-cloud2", regionLabel: regionFor(region).label };
  },
};

export default clientCredentials;
