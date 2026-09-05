import type { AuthDefinition } from "@w6w/types";
import { normalizeSiteUrl, resolveBaseUrl } from "../lib/client.ts";

/**
 * HTTP Basic against the customer's own WordPress site, using a WordPress
 * Application Password — verified against
 * `formidableforms.com/knowledgebase/using-application-passwords-for-api-authentication/`
 * and `.../formidable-api-rest-endpoints/` (fetched 2026-09-05).
 *
 * ## Why an Application Password, and not the legacy Formidable API key
 *
 * Formidable documents two credential kinds, and they are not interchangeable:
 *
 *   - **The legacy Formidable API key** (`Formidable -> Global Settings -> API`,
 *     stored as `frm_api_key`) authenticates only the old `/frm/v2` "Send API
 *     Data" webhook flow. The vendor's own docs say it "runs a request with
 *     administrator access" — an unscoped, unrevocable-per-integration
 *     credential — and it is never documented as valid for `/frm/v3`.
 *   - **A WordPress Application Password** (`Users -> Profile -> Application
 *     Passwords`) is what `/frm/v3`, the Abilities API, and the MCP server all
 *     authenticate with. It "belongs to one WordPress user. The request has the
 *     same permissions as that user" — so a dedicated integration user can be
 *     scoped to only the Formidable permissions it needs
 *     (`Formidable -> Global Settings -> Permissions`), and revoked independently
 *     of any other integration.
 *
 * This app implements only the Application Password route, for a new `/frm/v3`
 * integration, per the vendor's own guidance ("Use an Application Password for
 * Formidable REST API v3 ... integrations").
 *
 * ## Per-site host
 *
 * The site URL is a property of the CONNECTION, not of a call, so it is
 * collected here once and republished as `connection.display.siteUrl` by
 * `afterConnect`. `lib/client.ts` reads it from there — actions only ever see
 * the redacted Connection, never the credential.
 */

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so we
 * cannot pull `jsr:@std/encoding` at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Application Password",
  description: "HTTP Basic against your WordPress site using a WordPress Application Password " +
    "(Users -> Profile -> Application Passwords). Not the legacy Formidable API key, which " +
    "only authenticates the old /frm/v2 webhook flow. Requires HTTPS when credentials travel " +
    "over a network.",
  connectionLabel: "{{username}} @ {{site.host}}",
  fields: [
    {
      key: "siteUrl",
      label: "WordPress Site URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
      hint: "Base URL of the WordPress install that runs Formidable Forms, without a trailing " +
        "`/wp-json`. Include the subdirectory for a subdirectory install " +
        "(e.g. `https://example.com/blog`).",
    },
    {
      key: "username",
      label: "WordPress Username",
      type: "string",
      required: true,
      hint: "The user the Application Password belongs to. Its Formidable permissions " +
        "(Formidable -> Global Settings -> Permissions) govern what this connection can do.",
    },
    {
      key: "password",
      label: "Application Password",
      type: "secret",
      required: true,
      hint: "Generated at Users -> Profile -> Application Passwords on the site above. " +
        "WordPress shows it only once — store it here, not the account's login password.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    request.headers["authorization"] = `Basic ${encodeBase64(`${username}:${password}`)}`;
    return request;
  },

  /**
   * `GET /frm/v3/forms` — the cheapest authenticated read the reference
   * documents, needing only the "View Forms List" permission every dedicated
   * integration user is expected to carry. Reaching it proves four things a
   * transport-level check would conflate: the site resolves, the WordPress
   * REST API is on, `REST API` is switched on under Formidable's own settings
   * (which registers `/frm/v3`), and the credential is live.
   */
  async test({ credential }, ctx) {
    const { siteUrl, username, password } = credential as {
      siteUrl?: string;
      username?: string;
      password?: string;
    };
    if (!siteUrl || !username || !password) {
      return { ok: false, message: "credential missing siteUrl / username / password" };
    }

    let baseUrl: string;
    try {
      baseUrl = resolveBaseUrl({ siteUrl });
    } catch (e) {
      return { ok: false, message: String(e instanceof Error ? e.message : e) };
    }

    const res = await ctx.fetch(`${baseUrl}/forms`, {
      headers: {
        accept: "application/json",
        authorization: `Basic ${encodeBase64(`${username}:${password}`)}`,
      },
    });
    if (res.status === 404) {
      return {
        ok: false,
        message: "Formidable REST API v3 not found at this site — check the site URL, and " +
          "confirm REST API is switched on at Formidable -> Global Settings -> API",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "the credential is valid but its WordPress user lacks the Formidable " +
          '"View Forms List" permission (403)',
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        message = (JSON.parse(body) as { message?: string }).message;
      } catch {
        // Non-JSON body; fall back to the status alone.
      }
      return { ok: false, message: message ?? `Formidable returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the site URL on the Connection so actions and the `site` health
   * check can build URLs without the credential. Nothing here goes on the
   * wire: the only account-identifying value Formidable would expose is the
   * permission set behind the same credential `test` already exercised, so a
   * second call would buy nothing.
   */
  afterConnect({ credential }) {
    const { siteUrl, username } = credential as { siteUrl?: string; username?: string };
    const normalized = normalizeSiteUrl(siteUrl ?? "");
    let host = "";
    try {
      host = normalized ? new URL(normalized).host : "";
    } catch {
      // Leave blank rather than guess — the label degrades, nothing breaks.
    }
    return { siteUrl: normalized, username, site: { host } };
  },
};

export default basic;
