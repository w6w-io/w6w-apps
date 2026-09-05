import type { HookContext } from "@w6w/types";

/**
 * LinkedIn Conversions API — the versioned `/rest/` surface under
 * `api.linkedin.com` covering Conversion Rules (`conversions`), Campaign
 * Conversions (`campaignConversions`) and Streaming Conversion Events
 * (`conversionEvents`).
 *
 * This is a **separate product surface** from both other LinkedIn apps in
 * this pack: the member/social `linkedin` app (Posts API) and the campaign
 * management `linkedin-ads` app. All three share a host and the same Rest.li
 * transport conventions (`X-Restli-Protocol-Version: 2.0.0`, versioned via
 * `Linkedin-Version`), but Conversions API is server-side conversion event
 * reporting — a distinct product with its own OAuth scopes (`rw_conversions`,
 * `r_ads` — not `linkedin-ads`'s `rw_ads`/`r_ads_reporting`) and its own
 * approval gate.
 *
 * Everything below was verified on 2026-09-05 against Microsoft Learn's
 * LinkedIn Marketing docs — `integrations/ads-reporting/conversions-api`,
 * `integrations/ads-reporting/conversions-api-schema` and
 * `integrations/ads-reporting/conversion-tracking` (the Campaign Conversions
 * section) — plus live, unauthenticated probes against `api.linkedin.com`.
 *
 * ## The version header, and why 202608
 *
 * Every `/rest/` call MUST carry `Linkedin-Version: YYYYMM`. LinkedIn
 * publishes a new version monthly and supports each for a **minimum of one
 * year** before sunsetting it on a rolling schedule — the versioning doc
 * itself carries a live banner: "The Marketing Version 202508 (Marketing
 * August 2025) will be sunset on August 17, 2026." A stale header eventually
 * errors rather than quietly serving an old shape, so **the pinned version
 * below needs a periodic bump** — check
 * https://learn.microsoft.com/en-us/linkedin/marketing/versioning for the
 * current "Latest Version" before it goes stale.
 *
 * `202608` (August 2026) was that page's documented "Latest Version" on
 * 2026-09-05, and is also the version this app pins for the two new
 * `MARKETING_QUALIFIED_LEAD`/`SALES_QUALIFIED_LEAD` conversion types, which
 * the schema docs say are "supported only for API versions 202608 and
 * later."
 *
 * ## Two different URN namespaces, and they are not interchangeable
 *
 * A Conversion Rule's own id is addressed as `urn:lla:llaPartnerConversion:{id}`
 * — the `lla` namespace, not LinkedIn's usual `li` namespace every Ad Account
 * / Campaign / Creative URN uses. Mixing the two up produces a syntactically
 * plausible but wrong URN that LinkedIn rejects with an "Invalid Urn format"
 * error rather than a helpful "wrong id" message — see {@link llaPartnerConversionUrn}
 * vs {@link sponsoredAccountUrn}/{@link sponsoredCampaignUrn}.
 *
 * ## Conversion Rules do not have a documented single-item DELETE
 *
 * Only the association between a campaign and a conversion rule
 * (`campaignConversions`) has a documented `DELETE`. A Conversion Rule
 * itself has no documented delete endpoint at all — the closest analog is
 * `conversion-rule-update` setting `enabled: false`, which stops it from
 * matching new conversions without removing the rule or its history. No
 * `conversion-rule-delete` action is included here because there is nothing
 * to call.
 *
 * ## Conversion Rule search is index-paginated, not cursor-paginated
 *
 * `GET /rest/conversions?q=account` answers the older `paging.start/count`
 * shape (like `linkedin-ads`'s DMP Segments), not the `pageSize`/`pageToken`
 * cursor shape `linkedin-ads` uses for Ad Accounts/Campaigns/Creatives. This
 * client exposes it verbatim rather than normalising it.
 *
 * ## Create returns no body — the id is in a header
 *
 * A successful `POST` that creates a Conversion Rule answers `201` with the
 * new rule's numeric id in both the `id` response-body field and the
 * `x-restli-id` response header — mirroring the sibling apps' create
 * actions. `request()` surfaces the header as `{ id }` when the body is
 * empty, though the docs' own sample response for a single create includes a
 * body too.
 */

/** The one and only API origin for the versioned Rest.li surface. */
export const API_URL = "https://api.linkedin.com";

/**
 * Pinned per the versioning policy above. Bump when Microsoft Learn's
 * versioning page names a newer "Latest Version" — check before shipping.
 */
export const API_VERSION = "202608";

export interface LinkedInConversionsErrorBody {
  status?: number;
  /** Numeric internal error code, e.g. `65600`. Present on most 4xx bodies. */
  serviceErrorCode?: number;
  /** Stable machine code, e.g. `INVALID_ACCESS_TOKEN`, `EMPTY_ACCESS_TOKEN`. */
  code?: string;
  message?: string;
}

export interface RequestOptions {
  method?: string;
  /**
   * Query parameters, pre-built by the caller into their final Rest.li wire
   * form. Appended verbatim rather than run through `URLSearchParams`, which
   * would percent-encode the `(`, `)` and `,` the grammar depends on.
   */
  query?: Record<string, string | undefined>;
  body?: unknown;
  /**
   * Sets `X-RestLi-Method`. Required whenever the HTTP verb alone doesn't say
   * which Rest.li operation this is: `FINDER` (a `q=` query other than the
   * default resource-collection GET), `PARTIAL_UPDATE` or `BATCH_CREATE`.
   */
  restliMethod?: string;
}

/**
 * Thin wrapper over `ctx.fetch` for the versioned `/rest/` API. Every call
 * carries the two headers LinkedIn requires (`X-Restli-Protocol-Version`,
 * `Linkedin-Version`); `Authorization` is injected by the auth `sign` hook,
 * never here.
 */
export class LinkedInConversionsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const qs = Object.entries(options.query ?? {})
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const url = `${API_URL}${path}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-restli-protocol-version": "2.0.0",
      "linkedin-version": API_VERSION,
    };
    if (options.restliMethod) headers["x-restli-method"] = options.restliMethod;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(formatLinkedInConversionsError(res.status, init.method ?? "GET", path, raw));
    }

    if (res.status === 204) return undefined as T;

    const restliId = res.headers.get("x-restli-id");
    const text = await res.text();
    if (!text) return (restliId ? { id: restliId } : undefined) as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn LinkedIn's error body into one actionable line. `code` is kept
 * verbatim because it's the stable, documented signal — `EMPTY_ACCESS_TOKEN`
 * (no credential reached the request), `INVALID_ACCESS_TOKEN` (wrong,
 * expired or revoked) and `USER_NOT_AUTHORIZED` (missing ad account role or
 * app permission) are three different problems, and a flattened "HTTP 401"
 * hides which one you hit. The message can carry only LinkedIn's own prose
 * and the caller's own input.
 */
export function formatLinkedInConversionsError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LinkedInConversionsErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LinkedInConversionsErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.code) {
    return `LinkedIn ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
  }
  const parts = [
    `LinkedIn ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.message,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

// --------------------------------------------------------------- URNs -----

/** Accepts a bare id or an already-formed URN and returns the URN. */
function toUrn(namespace: string, kind: string, id: string | number): string {
  const s = String(id);
  return s.startsWith("urn:") ? s : `urn:${namespace}:${kind}:${s}`;
}

export const sponsoredAccountUrn = (id: string | number): string =>
  toUrn("li", "sponsoredAccount", id);
export const sponsoredCampaignUrn = (id: string | number): string =>
  toUrn("li", "sponsoredCampaign", id);

/**
 * A Conversion Rule's own URN — the `lla` namespace, NOT `li`. See the
 * module doc comment for why this distinction matters.
 */
export const llaPartnerConversionUrn = (id: string | number): string =>
  toUrn("lla", "llaPartnerConversion", id);

/**
 * Strip any `urn:...:` prefix down to the bare trailing id, for building a
 * path segment. Conversion Rule paths (`/conversions/{id}`) take the bare
 * numeric id, never the URN.
 */
export function bareId(idOrUrn: string | number): string {
  const s = String(idOrUrn);
  const i = s.lastIndexOf(":");
  return i === -1 ? s : s.slice(i + 1);
}

/** URL-encode a URN (or any dynamic value) for embedding in a path segment or query value. */
export const encodeUrn = (value: string | number): string => encodeURIComponent(String(value));

/** `List(a,b,c)`, each member percent-encoded (safe for URNs and plain enums alike). */
export function restliList(values: ReadonlyArray<string | number>): string {
  return `List(${values.map(encodeUrn).join(",")})`;
}

/**
 * The compound key Rest.li uses to address a single `campaignConversions`
 * association: `(campaign:{urn},conversion:{urn})`. Only the colons inside
 * each URN are percent-encoded (`%3A`) — the outer parens, field names and
 * comma stay literal — matching every sample the docs show verbatim
 * (`campaignConversions/(campaign:urn%3Ali%3AsponsoredCampaign%3A...,conversion:urn%3Alla%3AllaPartnerConversion%3A...)`).
 */
export function campaignConversionKey(campaignUrn: string, conversionUrn: string): string {
  const enc = (urn: string) => urn.replace(/:/g, "%3A");
  return `(campaign:${enc(campaignUrn)},conversion:${enc(conversionUrn)})`;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed
 * — the host hands a `json` param through in whichever shape it arrived.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Drop keys the caller left unset, for a plain JSON request body. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
