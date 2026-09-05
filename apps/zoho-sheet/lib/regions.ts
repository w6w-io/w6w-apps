/**
 * Zoho's regional data centres, as they apply to the Zoho Sheet Data API.
 *
 * Zoho hosts every account in one of several regional data centres, each with
 * its own OAuth host (`accounts.zoho.<tld>`) and its own Sheet API host
 * (`sheet.zoho.<tld>`) — the same per-product-subdomain convention this pack's
 * `zohomail` app documents for Mail, not CRM/Books' shared `www.zohoapis.<tld>`.
 * `defaultAPIUrl` in Zoho's own API Playground JS
 * (`zohowebstatic.com/.../js/node/sheet/21165-en.js`, fetched live 2026-09-05)
 * hardcodes `https://sheet.zoho.com/api/v2/` and its `getAccessToken` helper
 * builds the same host from a `dcdomainOne` region suffix — confirming the
 * `sheet.zoho.<tld>` pattern rather than assuming it from another Zoho app.
 *
 * **Seven data centres, not eight — Zoho Sheet has no Canadian API host at
 * all**, verified live 2026-09-05:
 *   - `sheet.zoho.ca` does not resolve (DNS failure, not a TLS/HTTP error).
 *   - `www.zohoapis.ca/sheet/api/v2/workbooks` (the CRM/Books-style host, on
 *     the chance Sheet piggybacks on it in that one region) answers
 *     `404 API endpoint not found` — a real, structured negative, not a
 *     network failure — so this is a genuine product gap, not a naming
 *     mismatch to work around the way `zohobooks` works around Canada's
 *     accounts-host mismatch.
 *   - The other seven hosts below (`.com`, `.eu`, `.in`, `.com.au`, `.jp`,
 *     `.com.cn`, `.sa`) were all probed unauthenticated
 *     (`POST /api/v2/workbooks`, no Authorization header) and every one
 *     answered the identical documented shape:
 *     `401 {"error_message":"Valid [authorization ticket] is required for
 *     processing the request.","error_code":2401}` — not a catch-all 200 or a
 *     generic 404.
 *   - Every `accounts.zoho.<tld>/oauth/v2/auth` host below answered `302` for
 *     a syntactically valid authorize request, same day.
 *
 * `auth/oauth2.ts` builds one `AuthDefinition` per entry below, mirroring
 * `zohobooks`'s reasoning: the OAuth authorization/token host is baked into
 * the flow itself (RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are
 * static per method), so a single method with a "data centre" field cannot
 * express it — the browser is already redirected to a specific accounts host
 * before any in-flow field could be read.
 */
export interface ZohoSheetRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Sheet Data API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoSheetRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "sheet.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "sheet.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "sheet.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "sheet.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "sheet.zoho.jp" },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "sheet.zoho.com.cn",
  },
  { key: "sa", label: "Saudi Arabia", accountsHost: "accounts.zoho.sa", apiHost: "sheet.zoho.sa" },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
