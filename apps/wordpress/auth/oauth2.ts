import type { AuthDefinition } from "@w6w/types";
import { resolveBaseUrl } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the WordPress.com hosted path. Requires a WordPress.com
 * developer app (Developer → My Applications → Create New Application). The
 * resulting client_id / client_secret / redirect_uri live in an
 * `app_oauth_config` row on this w6w installation, not on the App manifest.
 *
 * This method only works against WordPress.com-hosted sites (routed via
 * `public-api.wordpress.com/wp/v2/sites/<site>`). For self-hosted installs,
 * use `./basic.ts` instead.
 *
 * The user picks their WordPress.com site (subdomain or custom domain) at
 * connect time; we republish it as `connection.display.wordpressSite` so the
 * client can compute the correct base URL without seeing the credential.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (WordPress.com)",
  description:
    "OAuth2 against WordPress.com-hosted sites. Requires a WordPress.com developer " +
    "app (client_id / client_secret / redirect_uri) configured on this w6w installation. " +
    "For self-hosted WordPress, use the Application Password method instead.",
  connectionLabel: "{{user.name}} @ {{wordpressSite}}",
  oauth2: {
    authorizationUrl: "https://public-api.wordpress.com/oauth2/authorize",
    tokenUrl: "https://public-api.wordpress.com/oauth2/token",
    scopes: ["global"],
    scopeSeparator: " ",
    // WordPress.com's OAuth server does not support PKCE — fall back to plain
    // authorization-code exchange, which is why client_secret is required.
    pkce: false,
  },
  fields: [
    {
      key: "wordpressSite",
      label: "WordPress.com Site",
      type: "string",
      required: true,
      placeholder: "myblog.wordpress.com",
      hint: "The .wordpress.com subdomain or custom domain hosted on WordPress.com.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken, wordpressSite } = credential as {
      accessToken?: string;
      wordpressSite?: string;
    };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!wordpressSite) return { ok: false, message: "credential missing wordpressSite" };
    const baseUrl = resolveBaseUrl({ wordpressSite });
    const res = await ctx.fetch(`${baseUrl}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `WordPress returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { wordpressSite } = credential as { wordpressSite?: string };
    const res = await ctx.fetch("/users/me");
    let user: { id?: number; name?: string; slug?: string } = {};
    if (res.ok) {
      user = await res.json() as typeof user;
    }
    return {
      wordpressSite,
      user: { id: user.id, name: user.name, slug: user.slug },
    };
  },
};

export default oauth2;
