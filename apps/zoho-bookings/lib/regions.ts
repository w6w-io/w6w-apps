/**
 * Zoho's regional data centres, as Zoho Bookings documents them.
 *
 * Zoho hosts every account in exactly one of eight regional data centres,
 * each with its own API host — verified live 2026-09-05 against
 * `https://www.zoho.com/bookings/help/api/v1/domain-specificapiurls.html`
 * (the "Domain-specific API URLs" page, fetched via the Wayback Machine —
 * `www.zoho.com` answers a bare 403 to this container's live requests, but
 * the page's own table gives exactly these eight `www.zohoapis.<tld>/bookings/`
 * base URLs) and cross-checked against this pack's `zoho` (CRM, US-only) and
 * `zohobooks`/`zohodesk` (all eight, same `www.zohoapis.<tld>` host
 * convention Bookings' own table also uses) apps.
 *
 * **Canada is the one place the API host and the OAuth (accounts) host
 * disagree in naming — same finding `zohobooks`/`zohodesk` already document
 * for their own products.** Bookings' domain table gives the Canadian API
 * base as `https://www.zohoapis.ca/bookings/`, but there is no
 * `accounts.zoho.ca`: a live probe of `https://accounts.zoho.ca/oauth/v2/auth`
 * fails to connect at all (measured 2026-09-05, this container), while
 * `https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real
 * redirect to the Zoho login page). The OAuth/accounts system
 * (`accounts.zoho.<tld>`) is shared platform-wide across every Zoho product —
 * it is not part of the Bookings-specific API docs, which say nothing about
 * it beyond "register your app in the Zoho API console" — so this table
 * reuses the exact accounts hosts `zohobooks`/`zohodesk` already verified
 * live, rather than re-deriving Zoho's central login infrastructure from
 * scratch.
 *
 * All eight `www.zohoapis.<tld>/bookings/v1/json/workspaces` endpoints
 * (unauthenticated) were probed live 2026-09-05 for the three hosts checked
 * directly (`.com`, `.eu`, `.ca`) and answered a consistent `400` — see
 * `lib/client.ts` module docs for why that response is NOT the documented
 * JSON envelope.
 *
 * `oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a
 * single method with a "data centre" field, because the OAuth
 * authorization/token host is baked into the auth flow itself (RFC
 * `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are static per method) —
 * a field collected mid-flow cannot retarget which host the browser is
 * already redirected to. The user picks the auth method matching their
 * account's data centre; the app's `network.allow` lists every `apiHost`
 * below so any of the eight can be connected.
 */
export interface ZohoBookingsRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Bookings REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoBookingsRegion[] = [
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
