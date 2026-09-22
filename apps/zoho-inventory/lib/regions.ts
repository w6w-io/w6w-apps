/**
 * Zoho's regional data centres, as Zoho Inventory documents them.
 *
 * Zoho hosts every organization in exactly one of eight regional data
 * centres, each with its own OAuth host (`accounts.zoho.<tld>`) and its own
 * API host (`www.zohoapis.<tld>`) — verified live 2026-09-22 against
 * `https://www.zoho.com/inventory/api/v1/introduction/` (the multi-data-centre
 * domain table gives exactly these eight `www.zohoapis.<tld>/inventory/v1`
 * base URIs) and `https://www.zoho.com/inventory/api/v1/oauth/`.
 *
 * **Zoho Inventory reuses the shared `www.zohoapis.<tld>` gateway host, not a
 * dedicated product host.** That is the same convention this pack's
 * `zohobooks` (Zoho Books) and `zoho` (Zoho CRM) apps use, and unlike
 * `zohodesk`/`zoho-campaigns`, whose products get their own
 * `*.zoho.<tld>` subdomain per region. A URL pattern learned from Desk or
 * Campaigns — `inventory.zoho.com`-style hosts for Inventory, say — does not
 * exist here: the product is selected by the `/inventory/v1` path segment on
 * the shared gateway, never by the hostname. Every one of the eight
 * `www.zohoapis.<tld>/inventory/v1` API hosts was probed unauthenticated on
 * 2026-09-22 and answered the documented
 * `401 {"code":14,"message":"The request could not be authenticated as the
 * authentication value you entered is invalid. Enter a valid authentication
 * value and try again."}` — a live product API, not a catch-all 200 or a
 * generic 404.
 *
 * **Canada is the one place API host and accounts host DISAGREE in naming.**
 * The documented Canadian API base is `https://www.zohoapis.ca/inventory/v1`
 * — the same `www.zohoapis.<tld>` shape as the other seven — but there is no
 * `accounts.zoho.ca`: a live probe of `https://accounts.zoho.ca/oauth/v2/auth`
 * fails to connect at all (measured 2026-09-22), while
 * `https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect
 * to the Zoho login page). This is the same fact `zohobooks` and `zohomail`
 * document for their Canadian entries. Assuming `accounts.zoho.ca` from the
 * API host's pattern — the easy mistake, since seven of the eight regions DO
 * follow that pattern — breaks OAuth for exactly one region in a way that
 * looks like a typo rather than a design fact.
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
export interface ZohoInventoryRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Inventory REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoInventoryRegion[] = [
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

/** Every `apiHost` in {@link REGIONS} — must be covered by `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
