/**
 * Zoho's regional data centres, as Zoho Recruit actually serves them.
 *
 * Zoho's own "Multi DC" page for Recruit
 * (`https://www.zoho.com/recruit/developer-guide/apiv2/multi-dc.html`) lists
 * only **six** data centres — US, AU, EU, IN, CN, JP — and even for those it
 * documents the wrong API host convention (see below). Live probing on
 * 2026-09-05 found **ten**, the same count and the same set this pack's
 * `zohodesk` app documents: the six above plus Saudi Arabia, Canada,
 * Singapore and the United Arab Emirates. Every `recruit.zoho.<tld>` (and
 * `recruit.zohocloud.ca`) `GET /recruit/v2/Candidates` answered the
 * structured `401 {"code":"AUTHENTICATION_FAILURE",...}` shape unauthenticated
 * — not a DNS failure, not a generic 404 — and every corresponding
 * `accounts.zoho.<tld>/oauth/v2/auth` (and `accounts.zohocloud.ca`) answered
 * `302` for a syntactically valid authorize request. A handful of
 * plausible-looking guesses that do NOT exist were also probed and failed
 * DNS resolution outright (`recruit.zoho.ca`, `recruit.zoho.com.sg`,
 * `accounts.zoho.com.sg`) — ruling out a false positive from a wildcard
 * catch-all before trusting the ten that did resolve.
 *
 * **The Recruit API host is `recruit.zoho.<tld>` DIRECTLY — not
 * `www.zohoapis.<tld>`.** The vendor's own "Multi DC" page gets this wrong
 * for every non-US region, telling readers to use
 * `https://www.zohoapis.eu/recruit/v2/Candidates` — live, every
 * `www.zohoapis.<tld>/recruit/v2/...` path (all eight `zohobooks` hosts
 * tried) answers `404 API endpoint not found`, a generic gateway response,
 * not Recruit's own structured error shape. This pack's `zoho` (CRM) and
 * `zohobooks` apps front their APIs behind that shared `www.zohoapis.<tld>`
 * gateway; Recruit does not — it serves its own API from its own product
 * subdomain, the same shape as `zohodesk`'s `desk.zoho.<tld>` and
 * `zohomail`'s `mail.zoho.<tld>`.
 *
 * **Canada is again the one place the accounts host does NOT follow the API
 * host's naming pattern**, exactly as `zohobooks`, `zohodesk` and `zohomail`
 * already document for their own Canadian entries: `recruit.zohocloud.ca`
 * answers the real API (confirmed live), `recruit.zoho.ca` does not resolve
 * at all, and the matching OAuth host is `accounts.zohocloud.ca` —
 * `accounts.zoho.ca` fails to connect.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a
 * single method with a "data centre" field, for the same reason the sibling
 * apps do: the OAuth authorization/token host is baked into the auth flow
 * itself (RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are static
 * per method) — a field collected mid-flow cannot retarget which host the
 * browser is already redirected to. The user picks the auth method matching
 * their account's data centre; the app's `network.allow` lists every
 * `apiHost` below so any of the ten can be connected.
 */
export interface ZohoRecruitRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Recruit REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoRecruitRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "recruit.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "recruit.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "recruit.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "recruit.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "recruit.zoho.jp" },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "recruit.zoho.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "recruit.zoho.sa",
  },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "recruit.zohocloud.ca",
  },
  { key: "sg", label: "Singapore", accountsHost: "accounts.zoho.sg", apiHost: "recruit.zoho.sg" },
  {
    key: "ae",
    label: "United Arab Emirates",
    accountsHost: "accounts.zoho.ae",
    apiHost: "recruit.zoho.ae",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
