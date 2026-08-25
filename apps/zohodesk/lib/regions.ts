/**
 * Zoho's regional data centres, as Zoho Desk documents them.
 *
 * Zoho hosts every organization in exactly one of **ten** regional data
 * centres — verified live 2026-08-25 against
 * `https://desk.zoho.com/DeskAPIDocument#Introduction`, the "API Endpoints by
 * Data Center" table (`#DataCenterEndpoints`). This is TWO more than this
 * pack's `zoho` (Zoho CRM, US-only) and `zohobooks` (eight) apps document —
 * Zoho Desk additionally serves Singapore (SG) and the United Arab Emirates
 * (UAE), data centres neither CRM nor Books lists.
 *
 * **The Desk API host is `desk.zoho.<tld>` DIRECTLY — not
 * `www.zohoapis.<tld>`.** Every other Zoho product this pack ships (CRM,
 * Books, Mail) fronts its REST API behind the shared `www.zohoapis.<tld>`
 * gateway host; Desk is the odd one out, serving its own API from its own
 * product subdomain, the same shape as `zohomail`'s `mail.zoho.<tld>`. Do not
 * assume `www.zohoapis.<tld>` from the sibling apps' pattern — it answers a
 * generic 200/404 for Desk paths rather than the documented `errorCode` shape.
 *
 * **Canada is again the one place the accounts host does NOT follow the API
 * host's naming pattern**, exactly as `zohobooks` and `zohomail` already
 * document for their own Canadian entries: the documented API base is
 * `https://desk.zohocloud.ca`, but there is no `accounts.zoho.ca` — the real
 * OAuth host is `accounts.zohocloud.ca` (live: `accounts.zoho.ca/oauth/v2/auth`
 * fails to connect at all, `accounts.zohocloud.ca/oauth/v2/auth` answers
 * `302`, measured 2026-08-25).
 *
 * All ten `desk.zoho.<tld>/api/v1/organizations` endpoints were probed
 * unauthenticated on 2026-08-25 and every one answered the documented shape:
 * `401 {"errorCode":"UNAUTHORIZED","message":"You are not authenticated to
 * perform this operation."}` — not a catch-all 200 or a generic 404. Every
 * `accounts.zoho.<tld>/oauth/v2/auth` (and `accounts.zohocloud.ca`) answered
 * `302` for a syntactically valid authorize request.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a
 * single method with a "data centre" field, for the same reason `zohobooks`
 * does: the OAuth authorization/token host is baked into the auth flow itself
 * (RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are static per
 * method) — a field collected mid-flow cannot retarget which host the browser
 * is already redirected to. The user picks the auth method matching their
 * organization's data centre; the app's `network.allow` lists every `apiHost`
 * below so any of the ten can be connected.
 */
export interface ZohoDeskRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Desk REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoDeskRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "desk.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "desk.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "desk.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "desk.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "desk.zoho.jp" },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "desk.zohocloud.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "desk.zoho.com.cn",
  },
  { key: "sa", label: "Saudi Arabia", accountsHost: "accounts.zoho.sa", apiHost: "desk.zoho.sa" },
  { key: "sg", label: "Singapore", accountsHost: "accounts.zoho.sg", apiHost: "desk.zoho.sg" },
  {
    key: "ae",
    label: "United Arab Emirates",
    accountsHost: "accounts.zoho.ae",
    apiHost: "desk.zoho.ae",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
