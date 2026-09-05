/**
 * Zoho's regional data centres, as they apply to Zoho Calendar.
 *
 * Zoho Calendar's own documentation (`https://www.zoho.com/calendar/help/api/introduction.html`,
 * checked live 2026-09-05) names exactly one base URL — `https://calendar.zoho.com/api/v1` — and
 * never mentions a second host. But Zoho hosts every account in one of several regional data
 * centres (the same fact this pack's `zoho` (CRM, US-only) and `zohobooks`/`zohodesk` (all eight)
 * apps already document), and the OAuth token a Calendar connection carries is only valid against
 * the API host that matches the *authorizing* account's data centre — a US-issued token does not
 * work against `calendar.zoho.eu`, and vice versa. Scoping this app to the one host the
 * introduction page shows would silently fail for every non-US account.
 *
 * Verified live 2026-09-05, by probing `https://calendar.zoho.<tld>/api/v1/calendars` unauthenticated
 * on all eight candidate hosts (the same set `zohobooks`/`zohodesk` document for their own
 * `www.zohoapis.<tld>` product host): every one is a real, distinct Zoho Calendar deployment,
 * answering the documented error envelope —
 * `{"error":[{"description":"Invalid ticket.","error_code":"INVALID_TICKET","message":"INVALID_TICKET"}]}`
 * — rather than a generic 404 or an unrelated service. `calendar.zoho.<tld>` reuses the exact
 * `<product>.zoho.<tld>` naming convention Zoho Mail's regional hosts use, not CRM/Books' shared
 * `www.zohoapis.<tld>`.
 *
 * **Canada breaks the naming pattern on BOTH hosts, not just the accounts one.** `zohobooks` and
 * `zohodesk` document a Canadian *accounts* host oddity (`accounts.zohocloud.ca`, not
 * `accounts.zoho.ca`) while their own *API* host still follows the plain `<tld>` pattern
 * (`www.zohoapis.ca`). Zoho Calendar does not get that half right: `calendar.zoho.ca` does not
 * resolve at all — `curl`/`getent` both fail outright (measured 2026-09-05, "Could not resolve
 * host") — while `calendar.zohocloud.ca` resolves and answers the documented error envelope. Same
 * for the accounts host: `https://accounts.zoho.ca/oauth/v2/auth` fails to connect (no TLS
 * handshake), `https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect to the
 * Zoho login page). Assuming the `<tld>` pattern holds for all eight regions — the easy mistake,
 * since seven of the eight DO follow it — breaks BOTH ends of OAuth for this one region, in a way
 * that looks like a typo rather than a design fact.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a single method with a
 * "data centre" field, because the OAuth authorization/token host is baked into the flow itself
 * (RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are static per method) — a field collected
 * mid-flow cannot retarget which host the browser is already redirected to. The user picks the auth
 * method matching their account's data centre; the app's `network.allow` lists every `apiHost`
 * below so any of the eight can be connected.
 */
export interface ZohoCalendarRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Calendar REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoCalendarRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "calendar.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "calendar.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "calendar.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "calendar.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "calendar.zoho.jp" },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "calendar.zohocloud.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "calendar.zoho.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "calendar.zoho.sa",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
