import type { AuthDefinition } from "@w6w/types";
import { resolveBaseUrl } from "../lib/client.ts";

/**
 * Inlined base64 encoder — the app sandbox has `import: false`, so we can't
 * pull from jsr:@std/encoding at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

/**
 * Basic Auth (`basic`) — the self-hosted path. WordPress lets each user mint
 * an "application password" from their profile page (Users → Profile →
 * Application Passwords) and use it in place of their real password with HTTP
 * Basic auth. The site's own URL is per-connection: we store it as
 * `siteUrl` on the credential and republish it as `connection.display.siteUrl`
 * so action code (which only sees the redacted connection) can build the
 * base URL.
 *
 * For the WordPress.com hosted path (browser OAuth flow) see `./oauth2.ts`.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Application Password",
  description:
    "Basic auth against a self-hosted WordPress install using an application password " +
    "(Users → Profile → Application Passwords).",
  connectionLabel: "{{user.name}} @ {{site.host}}",
  fields: [
    {
      key: "siteUrl",
      label: "WordPress Site URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
      hint: "Base URL of your WordPress install, without a trailing `/wp-json`.",
    },
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
    },
    {
      key: "password",
      label: "Application Password",
      type: "secret",
      required: true,
      hint: "Generated at Users → Profile → Application Passwords.",
    },
  ],

  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    const token = encodeBase64(`${username}:${password}`);
    request.headers["authorization"] = `Basic ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { siteUrl, username, password } = credential as {
      siteUrl?: string;
      username?: string;
      password?: string;
    };
    if (!siteUrl || !username || !password) {
      return { ok: false, message: "credential missing siteUrl / username / password" };
    }
    const baseUrl = resolveBaseUrl({ siteUrl });
    const token = encodeBase64(`${username}:${password}`);
    const res = await ctx.fetch(`${baseUrl}/users/me`, {
      headers: { authorization: `Basic ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `WordPress returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { siteUrl } = credential as { siteUrl?: string };
    const res = await ctx.fetch("/users/me");
    let user: { id?: number; name?: string; slug?: string } = {};
    if (res.ok) {
      user = await res.json() as typeof user;
    }
    let host = "";
    try {
      host = siteUrl ? new URL(siteUrl).host : "";
    } catch { /* leave blank */ }
    return {
      siteUrl,
      site: { host },
      user: { id: user.id, name: user.name, slug: user.slug },
    };
  },
};

export default basic;
