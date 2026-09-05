/**
 * Zoho's regional data centres, as Zoho Campaigns documents and serves them.
 *
 * Zoho hosts every account in exactly one of eight regional data centres,
 * each with its own OAuth host (`accounts.zoho.<tld>`) and its own Campaigns
 * API host (`campaigns.zoho.<tld>`) — verified live 2026-09-05 against
 * `https://www.zoho.com/campaigns/help/developers/access-token.html` (which
 * documents the OAuth mechanism and the single US API root
 * `https://campaigns.zoho.com/api/v1.1/`) and against live probes of all
 * eight `campaigns.zoho.<tld>`-shaped hosts and their `accounts.zoho.<tld>`
 * counterparts. Zoho Campaigns' own docs only ever show the US host; every
 * other regional host below was confirmed by direct probe, the same
 * verification this pack's `zoho` (Zoho CRM), `zohobooks`, `zohodesk` and
 * `zohomail` apps already did for their own products.
 *
 * **Canada breaks the naming pattern on BOTH hosts here — not just the
 * accounts host.** Every sibling Zoho app in this pack (`zoho`, `zohobooks`,
 * `zohodesk`, `zoho-invoice`) documents Canada's *accounts* host as the one
 * exception (`accounts.zohocloud.ca` instead of the `accounts.zoho.ca` the
 * pattern would predict), while their *API* host still follows the pattern
 * (`www.zohoapis.ca` resolves fine — confirmed live 2026-09-05, `401` on an
 * unauthenticated call). Zoho Campaigns is worse: `campaigns.zoho.ca` does
 * not resolve AT ALL (`curl: (6) Could not resolve host`, confirmed live
 * 2026-09-05) — the real Campaigns API host for Canada is ALSO
 * `campaigns.zohocloud.ca` (confirmed live: `401` on an unauthenticated call,
 * the same documented shape every other region answers). Assuming
 * `campaigns.zoho.ca` from the other seven regions' pattern — or from how
 * every *other* Zoho product in this pack handles Canada — breaks the
 * connection outright rather than merely mis-routing a call.
 *
 * All eight `campaigns.zoho.<tld>` (and `campaigns.zohocloud.ca`) API hosts
 * were probed unauthenticated on 2026-09-05 against
 * `/api/v1.1/getmailinglists?resfmt=JSON` and every one answered the
 * identical documented shape: `401
 * {"message":"Unauthorized request.","version":"1.1","URI":"/api/v1.1/getmailinglists","Code":"1007","status":"error"}`
 * — not a catch-all 200 or a generic 404. Every `accounts.zoho.<tld>/oauth/v2/auth`
 * (and `accounts.zohocloud.ca`) answered `302` for a syntactically valid
 * authorize request; `accounts.zoho.ca` failed to resolve, exactly like
 * `campaigns.zoho.ca`.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a
 * single method with a "data centre" field, for the same structural reason
 * `zoho-invoice`/`zohobooks` document for themselves: the OAuth
 * authorization/token host is baked into the auth flow itself (RFC
 * `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl` are static per method),
 * so it cannot be chosen by a field collected mid-flow — the browser has
 * already been redirected to a specific accounts host by the time any such
 * field would be read. The user picks the auth method matching their
 * account's data centre; the app's `network.allow` lists every `apiHost`
 * below so any of the eight can be connected.
 */
export interface ZohoCampaignsRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Campaigns REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoCampaignsRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "campaigns.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "campaigns.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "campaigns.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "campaigns.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "campaigns.zoho.jp" },
  {
    key: "ca",
    label: "Canada",
    // Both hosts break the `campaigns.zoho.<tld>` / `accounts.zoho.<tld>`
    // pattern for Canada — see the module doc.
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "campaigns.zohocloud.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "campaigns.zoho.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "campaigns.zoho.sa",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
