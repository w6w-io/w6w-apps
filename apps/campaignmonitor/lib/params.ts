import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Campaign Monitor actions.
 *
 * Every default, ceiling and enum here is copied from the vendor's reference
 * (fetched 2026-08-11), not inferred. Where the vendor's default is a poor fit
 * for a workflow step the difference is stated at the param rather than hidden.
 *
 * ## The scoping vocabulary, once
 *
 * Campaign Monitor nests **account → client → list → subscriber**, and the
 * three id params below are the seams:
 *
 *  - **account-level** endpoints (`/clients`, `/billingdetails`, `/systemdate`)
 *    take no id at all — they describe whatever account the credential belongs
 *    to.
 *  - **client-level** endpoints take `{clientid}`. A "client" is Campaign
 *    Monitor's sub-account: an agency has many, a direct customer has exactly
 *    one, and either way lists, campaigns, templates, segments, journeys and the
 *    suppression list all belong to a client and not to the account.
 *  - **list-, campaign-, segment- and template-level** endpoints take that
 *    resource's own id and no client id, because the id already identifies the
 *    client that owns it.
 *
 * A credential can itself be either scope — see `auth/api-key.ts` — which is
 * why `clientid` is `required` wherever the API requires it but is *optional* on
 * the `/transactional` endpoints, which is exactly what the vendor documents.
 */

export const clientIdParam: Param = {
  key: "clientId",
  label: "Client",
  type: "string",
  required: true,
  placeholder: "4a397ccaaa55eb4e6aa1221e1e2d7122",
  hint:
    "The 32-character client ID. A client is Campaign Monitor's sub-account: run List Clients, " +
    "or read it from Account settings → API keys. If your credential is a client-specific API " +
    "key it still belongs to exactly one client, and that is the only ID it can address.",
};

export const listIdParam: Param = {
  key: "listId",
  label: "List",
  type: "string",
  required: true,
  placeholder: "a58ee1d3039b8bec838e6d1482a8a965",
  hint:
    "The 32-character list ID. Run Get Client Lists, or open the list in Campaign Monitor and " +
    'read "List API ID" at the bottom of its Settings page.',
};

export const campaignIdParam: Param = {
  key: "campaignId",
  label: "Campaign",
  type: "string",
  required: true,
  placeholder: "fc0ce7105baeaf97f47c99be31d02a91",
  hint: "The 32-character campaign ID, as returned by Create Campaign, Get Sent Campaigns or " +
    "Get Draft Campaigns.",
};

export const emailParam: Param = {
  key: "email",
  label: "Email address",
  type: "string",
  required: true,
  placeholder: "person@example.com",
};

/**
 * `ConsentToTrack`, required on every write that can create or touch a
 * subscriber.
 *
 * It is genuinely required — omitting it fails with code 214 "Please provide a
 * consent to track value" — and it is *not* per-list: the vendor states the
 * value "applies to all subscribers with the same email address, within the
 * same client". `Unchanged` is offered because on a first sighting of an address
 * it is documented to mean "assume consent", which is a different decision from
 * asserting `Yes`.
 */
export const consentToTrackParam: Param = {
  key: "consentToTrack",
  label: "Consent to track",
  type: "select",
  required: true,
  default: "Unchanged",
  options: [
    { value: "Yes", label: "Yes — opens and clicks may be tracked" },
    { value: "No", label: "No — do not track" },
    {
      value: "Unchanged",
      label: "Unchanged — keep the existing preference (assumes consent if none is stored)",
    },
  ],
  hint: "Required by the API (error 214 if omitted). The value applies to every subscriber with " +
    "this email address across all of the client's lists, not just this one.",
};

/**
 * The 1-indexed page pair used by every paged endpoint.
 *
 * **The vendor's default page size is its maximum, 1000.** A workflow step that
 * silently returns a thousand subscribers is a footgun rather than a
 * convenience, so every paged action here prefills a smaller size and says so.
 * The floor is real: `pagesize` below 10 is rejected with code 801.
 */
export function pageParams(defaultPageSize = 100): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-indexed. Campaign Monitor's own default is 1.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: { integer: true, min: 10, max: 1000 },
      hint:
        `Between 10 and 1000 (error 801 outside that). The API's own default is 1000; ${defaultPageSize} ` +
        "is prefilled here so a step does not return a thousand records by accident.",
    },
  ];
}

/** `orderdirection`, shared by every paged endpoint. Rejected with code 803 if not asc/desc. */
export const orderDirectionParam: Param = {
  key: "orderDirection",
  label: "Order direction",
  type: "select",
  options: [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ],
  hint: "Leave empty to use the endpoint's own default.",
};

/** The paged-result output fields, identical on every paged endpoint. */
export const pagedOutput = [
  { key: "Results", type: "array" as const, label: "Records on this page" },
  { key: "PageNumber", type: "number" as const, label: "Page number (1-indexed)" },
  { key: "PageSize", type: "number" as const, label: "Page size" },
  { key: "RecordsOnThisPage", type: "number" as const, label: "Records on this page" },
  { key: "TotalNumberOfRecords", type: "number" as const, label: "Total matching records" },
  { key: "NumberOfPages", type: "number" as const, label: "Total number of pages" },
];

/**
 * The `CustomFields` array shared by the subscriber writes.
 *
 * Free-form JSON rather than a generated form because the accepted keys are the
 * *list's own* custom fields, which differ per list — run Get List Custom
 * Fields to see them. Note the vendor's two sharp edges, both documented at the
 * call sites that accept this: a Multi-Valued Select Many field is set by
 * repeating the same `Key` in several array entries, and clearing a value needs
 * an explicit `{"Key": …, "Value": "", "Clear": true}` entry.
 */
export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: 'Array of {Key, Value} objects, e.g. [{"Key":"website","Value":"https://example.com"}]. ' +
    "Keys are the list's own custom fields (see Get List Custom Fields). Repeat a key to set " +
    'several options of a Multi-Valued Select Many field. Add "Clear": true to erase a value. ' +
    "Each value is capped at 250 characters.",
};

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host passes a `json` param through in whichever shape it arrived.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Normalise a comma-separated or already-split list of recipients / addresses.
 *
 * The transactional endpoints take `To`/`CC`/`BCC` as JSON arrays of
 * `"Name <addr>"` or bare-address strings, capped at 25 across all three.
 */
export function toStringList(v: unknown): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}
