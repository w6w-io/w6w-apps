import type { AuthDefinition } from "@w6w/types";
import {
  API_HOST_SUFFIX,
  datacenterFromApiEndpoint,
  datacenterFromConnection,
} from "../lib/client.ts";

const METADATA_URL = "https://login.mailchimp.com/oauth2/metadata";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path.
 *
 * Mailchimp's OAuth is unusual: the access token is *not* enough to talk to
 * the API. After exchanging the code you must call
 * `https://login.mailchimp.com/oauth2/metadata` (a separate host from the API)
 * to discover the user's datacenter (`api_endpoint` in the response). All
 * subsequent API calls go to `https://<dc>.api.mailchimp.com/3.0/...` with
 * `Authorization: Bearer <access_token>`.
 *
 * We do the metadata call in `afterConnect` and cache the datacenter in the
 * connection's `display`. The client reads it from there, and `sign` only
 * needs the credential.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Mailchimp)",
  description:
    "Public OAuth flow. Requires a Mailchimp app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{account.email}}",
  oauth2: {
    authorizationUrl: "https://login.mailchimp.com/oauth2/authorize",
    tokenUrl: "https://login.mailchimp.com/oauth2/token",
    // Mailchimp's OAuth is coarse-grained: tokens grant full account access,
    // no incremental scopes.
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // Prefer the datacenter cached on the connection; fall back to a metadata
    // roundtrip so `test` still works before `afterConnect` has ever run.
    let datacenter: string;
    try {
      datacenter = datacenterFromConnection(ctx.connection);
    } catch {
      const meta = await ctx.fetch(METADATA_URL, {
        headers: { authorization: `OAuth ${accessToken}` },
      });
      if (!meta.ok) return { ok: false, message: `Mailchimp metadata returned ${meta.status}` };
      const { api_endpoint } = await meta.json() as { api_endpoint?: string };
      if (!api_endpoint) return { ok: false, message: "Mailchimp metadata missing api_endpoint" };
      datacenter = datacenterFromApiEndpoint(api_endpoint);
    }
    const res = await ctx.fetch(`https://${datacenter}.${API_HOST_SUFFIX}/ping`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Mailchimp returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken: string };
    // The metadata endpoint is special: it uses `Authorization: OAuth <token>`,
    // not `Bearer` — a quirk of Mailchimp's OAuth server.
    const meta = await ctx.fetch(METADATA_URL, {
      headers: { authorization: `OAuth ${accessToken}` },
    });
    if (!meta.ok) return {};
    const body = await meta.json() as {
      api_endpoint?: string;
      login?: { login_email?: string; login_name?: string; login_id?: number };
      accountname?: string;
      user_id?: number;
    };
    const datacenter = body.api_endpoint
      ? datacenterFromApiEndpoint(body.api_endpoint)
      : undefined;
    return {
      datacenter,
      account: {
        name: body.accountname ?? body.login?.login_name,
        email: body.login?.login_email,
        id: body.user_id ?? body.login?.login_id,
      },
    };
  },
};

export default oauth2;
