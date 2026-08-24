/**
 * Zoho's regional data centres, as Zoho Books documents them.
 *
 * Zoho hosts every organization in exactly one of eight regional data
 * centres, each with its own OAuth host (`accounts.zoho.<tld>`) and its own
 * API host (`www.zohoapis.<tld>`) — verified live 2026-08-24 against
 * `https://www.zoho.com/books/api/v3/introduction/` (the "Multiple Data
 * Centers" section lists exactly these eight `www.zohoapis.<tld>/books/`
 * base URIs) and `https://www.zoho.com/books/api/v3/oauth/`. This is the same
 * shape this pack's `zoho` (Zoho CRM, US-only) and `zohomail` (all eight,
 * `mail.zoho.<tld>`) apps document — Zoho Books' product host just reuses
 * CRM's `www.zohoapis.` convention rather than Mail's product-specific
 * subdomain.
 *
 * **Canada is the one place API host and accounts host DISAGREE in naming.**
 * Books' own domain table gives the Canadian API base as
 * `https://www.zohoapis.ca/books/` — but there is no `accounts.zoho.ca`: a
 * live probe of `https://accounts.zoho.ca/oauth/v2/auth` fails to connect at
 * all (measured 2026-08-24), while `https://accounts.zohocloud.ca/oauth/v2/auth`
 * answers `302` (a real redirect to the Zoho login page), exactly like
 * `zohomail`'s Canadian entry. Assuming `accounts.zoho.ca` from the API
 * host's pattern — the easy mistake, since seven of the eight regions DO
 * follow that pattern — breaks OAuth for exactly one region in a way that
 * looks like a typo rather than a design fact.
 *
 * All eight `www.zohoapis.<tld>/books/v3/organizations` endpoints were probed
 * unauthenticated on 2026-08-24 and every one answered the documented shape:
 * `401 {"code":14,"message":"The request could not be authenticated as the
 * authentication value you entered is invalid. Enter a valid authentication
 * value and try again."}` — not a catch-all 200 or a generic 404. Every
 * `accounts.zoho.<tld>/oauth/v2/auth` (and `accounts.zohocloud.ca`) answered
 * `302` for a syntactically valid authorize request.
 *
 * `oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a
 * single method with a "data centre" field, because the OAuth
 * authorization/token host is baked into the auth flow itself (RFC
 * `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are static per method) —
 * a field collected mid-flow cannot retarget which host the browser is
 * already redirected to. The user picks the auth method matching their
 * organization's data centre; the app's `network.allow` lists every
 * `apiHost` below so any of the eight can be connected.
 */
export interface ZohoBooksRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Books REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoBooksRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "www.zohoapis.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "www.zohoapis.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "www.zohoapis.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "www.zohoapis.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "www.zohoapis.jp" },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "www.zohoapis.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "www.zohoapis.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "www.zohoapis.sa",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
