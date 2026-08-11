import type { Option, OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Aircall actions.
 *
 * Every enum here is transcribed from Aircall's API reference (fetched
 * 2026-08-11 from `developer.aircall.io/api-references/`), not inferred. Where
 * the vendor states a different ceiling per endpoint the value is given at the
 * call site rather than averaged into one wrong number here.
 */

/**
 * The `page` / `per_page` pair every list endpoint accepts.
 *
 * **`per_page` has a hard ceiling of 50.** The reference's Pagination section:
 * "Number of results retrieved per page. Default is 20. Minimum is 1, maximum
 * is 50." Asking for 100 is not clamped silently in any documented way, so the
 * validation is stated here rather than discovered at runtime.
 *
 * The default is left at the vendor's 20 rather than raised: a workflow step
 * that silently returns 50 nested Call objects — each embedding a full User, a
 * full Number with nine message URLs, comments and tags — is a large payload,
 * and the caller can raise it deliberately.
 */
export function paginationParams(perPageHint?: string): Param[] {
  return [
    {
      key: "perPage",
      label: "Results per page",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 50 },
      hint: perPageHint ??
        "Aircall's maximum is 50 and its default is 20.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-based. Read `meta.next_page_link` from the previous response to know when to stop.",
    },
  ];
}

export interface PaginationInput {
  page?: number;
  perPage?: number;
}

export function paginationQuery(input: PaginationInput): Record<string, number | undefined> {
  return { page: input.page, per_page: input.perPage };
}

/**
 * `from` / `to` / `order` — the creation-window filter shared by the list
 * endpoints.
 *
 * `from` and `to` are **UNIX timestamps (seconds)**, not ISO 8601, on every
 * endpoint that accepts them. That is worth stating in the hint: passing an ISO
 * string is the kind of mistake that returns an empty list rather than an error.
 */
export function windowParams(subject: string): Param[] {
  return [
    {
      key: "from",
      label: "Created after",
      type: "string",
      placeholder: "1584998199",
      hint: `Earliest creation date for ${subject}, as a UNIX timestamp in seconds — not ISO 8601.`,
    },
    {
      key: "to",
      label: "Created before",
      type: "string",
      placeholder: "1584998210",
      hint: `Latest creation date for ${subject}, as a UNIX timestamp in seconds — not ISO 8601.`,
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: orderOptions,
      hint: "Sorted by creation date. Aircall's default is ascending (oldest first).",
    },
  ];
}

export interface WindowInput {
  from?: string;
  to?: string;
  order?: string;
}

export function windowQuery(input: WindowInput): Record<string, string | undefined> {
  return { from: input.from, to: input.to, order: input.order };
}

/** `order` — documented identically on every list endpoint. */
export const orderOptions: Option[] = [
  { value: "asc", label: "Ascending — oldest first (Aircall's default)" },
  { value: "desc", label: "Descending — newest first" },
];

/** `order_by`, accepted only by the two Contact list endpoints. */
export const contactOrderByOptions: Option[] = [
  { value: "created_at", label: "Creation date (default)" },
  { value: "updated_at", label: "Last update" },
];

/** `direction` on Search Calls. */
export const callDirectionOptions: Option[] = [
  { value: "inbound", label: "Inbound — an external caller reached an agent" },
  { value: "outbound", label: "Outbound — an agent called an external number" },
];

/**
 * `dispatching_strategy` on Transfer a Call.
 *
 * Only meaningful when transferring to a **Team**. The reference: "Invalid usage
 * of dispatching strategy with user or external phone number" is a documented
 * 400, so this is not merely ignored when paired with `user_id` or `number`.
 */
export const dispatchingStrategyOptions: Option[] = [
  { value: "simultaneous", label: "Simultaneous — ring every available member at once (default)" },
  { value: "random", label: "Random — ring available members one by one" },
  { value: "longest_idle", label: "Longest idle — ring the member idle longest, first" },
];

/**
 * The four `fetch_*` expansion flags on the Call read endpoints.
 *
 * They are off by default — in particular **contact details are not in a Call
 * payload unless `fetch_contact` is set**, which is why a Call's `contact` field
 * reads `null` for a call that plainly had one.
 */
export function callExpansionParams(): Param[] {
  return [
    {
      key: "fetchContact",
      label: "Include contact details",
      type: "boolean",
      hint:
        "Off by default. Without it every Call comes back with `contact: null`, even when a Contact " +
        "is attached.",
    },
    {
      key: "fetchShortUrls",
      label: "Include recording/voicemail short URLs",
      type: "boolean",
      hint:
        "Adds `recording_short_url` and `voicemail_short_url`. Those links expire after 3 hours " +
        "(the direct `recording` / `voicemail` URLs expire after 1).",
    },
    {
      key: "fetchCallTimeline",
      label: "Include IVR options selected",
      type: "boolean",
      hint: "Adds `ivr_options_selected` alongside the call, for Smartflow-enabled numbers.",
    },
    {
      key: "fetchAivaConv",
      label: "Include AI Voice Agent conversations",
      type: "boolean",
      hint: "Adds `ai_voice_agents` alongside the call.",
    },
  ];
}

export interface CallExpansionInput {
  fetchContact?: boolean;
  fetchShortUrls?: boolean;
  fetchCallTimeline?: boolean;
  fetchAivaConv?: boolean;
}

/** `Param` for a Call id. Int64 — see the hint. */
export const callIdParam: Param = {
  key: "callId",
  label: "Call ID",
  type: "string",
  required: true,
  placeholder: "812",
  hint:
    "The `id` of a Call. Aircall documents this as Int64, so keep it as a string end-to-end — a " +
    "JSON number loses precision above 2^53.",
};

export const userIdParam: Param = {
  key: "userId",
  label: "User",
  type: "string",
  required: true,
  placeholder: "456",
  hint: "Numeric User ID, or the User's email address — Aircall accepts either in the path.",
};

export const contactIdParam: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "string",
  required: true,
  placeholder: "710",
};

export const teamIdParam: Param = {
  key: "teamId",
  label: "Team ID",
  type: "string",
  required: true,
  placeholder: "678",
};

export const tagIdParam: Param = {
  key: "tagId",
  label: "Tag ID",
  type: "string",
  required: true,
  placeholder: "678",
};

export const numberIdParam: Param = {
  key: "numberId",
  label: "Number ID",
  type: "string",
  required: true,
  placeholder: "1234",
};

export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook ID",
  type: "string",
  required: true,
  placeholder: "c2501111-8a69-4342-bb34-bcd6cfe564ab",
  hint:
    "The `webhook_id` UUID. The reference notes the legacy numeric webhook Id is still accepted " +
    "here, which is how you migrate an old stored id to the UUID.",
};

/**
 * The phone-number params, all E.164.
 *
 * Aircall's "Dealing with phone numbers" section requires E.164 — `+` followed
 * by country code and digits, no spaces or punctuation — for every number the
 * API dials or transfers to. The `pattern` is the E.164 grammar itself (leading
 * `+`, first digit 1-9, up to 15 digits total).
 */
export function e164Param(key: string, label: string, required: boolean, hint: string): Param {
  return {
    key,
    label,
    type: "string",
    required,
    placeholder: "+18001231234",
    validation: { pattern: "^\\+[1-9]\\d{1,14}$" },
    hint,
  };
}

/**
 * The `meta` block, declared as output on every list action so a caller can
 * page without reading the source.
 */
export const listOutput: OutputField[] = [
  { key: "items", type: "array", label: "The page of records" },
  { key: "meta", type: "object", label: "Aircall's pagination block" },
  { key: "count", type: "number", label: "Records in this page" },
  { key: "total", type: "number", label: "Records matching the query, across all pages" },
  { key: "hasMore", type: "boolean", label: "True when meta.next_page_link is set" },
];

/**
 * The common projection every list action returns.
 *
 * `hasMore` is derived from `meta.next_page_link` rather than from
 * `count < total`: on Calls and Contacts, `total` can exceed the 10,000-item
 * pagination ceiling, so comparing the two promises a page the API will refuse
 * to serve. `next_page_link` is Aircall's own answer to "is there another page".
 */
export function listResult<T>(
  meta: { count?: number; total?: number; next_page_link?: string | null },
  items: T[],
): { items: T[]; meta: unknown; count: number; total: number | undefined; hasMore: boolean } {
  return {
    items,
    meta,
    count: meta.count ?? items.length,
    total: meta.total,
    hasMore: Boolean(meta.next_page_link),
  };
}
