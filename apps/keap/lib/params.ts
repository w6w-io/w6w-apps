import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and enum lists for the Keap actions.
 *
 * Every enum here is copied from Keap's OpenAPI documents (fetched 2026-08-11 —
 * see `lib/client.ts` for the URLs and checksums), never inferred. Where a
 * vendor default is a footgun it is overridden here and the reason is stated.
 */

/**
 * V2 page size.
 *
 * Keap documents `page_size` as "Total number of items to return per page" and
 * states **no default and no maximum** anywhere in the 958 KB v2 document — for
 * any of its 60-odd list endpoints. An unspecified default is not a small one
 * (the v1 document's equivalent `limit` defaults to 1,000), and a workflow step
 * that silently returns a thousand contacts is a footgun rather than a
 * convenience, so every list action here prefills a small page and says so.
 */
export function pageParams(defaultPageSize = 50): Param[] {
  return [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: { integer: true, min: 1 },
      hint:
        "Keap documents no default and no maximum for page_size, so this is prefilled small on " +
        "purpose. Raise it deliberately.",
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      advanced: true,
      hint:
        "Opaque cursor. Take it from the `nextPageToken` output of a previous call; leave empty " +
        "for the first page. Keap's v2 pagination is cursor-based — there is no page number and " +
        "no offset.",
    },
  ];
}

/**
 * `order_by` — one field plus one direction, in a single string.
 *
 * The allowed field list differs per endpoint (contacts sort by
 * `id|create_time|email|update_time`, campaigns by seven entirely different
 * names), so the allowed values are stated at each call site rather than
 * averaged into one wrong list here.
 */
export function orderByParam(hint: string): Param {
  return {
    key: "orderBy",
    label: "Order by",
    type: "string",
    advanced: true,
    placeholder: "create_time desc",
    hint,
  };
}

/**
 * The raw `filter` escape hatch.
 *
 * Every v2 list endpoint takes exactly one `filter` string in Keap's own
 * expression grammar rather than one query parameter per field. The typed
 * params on each action cover the common clauses; this exposes the rest
 * (comparison operators, custom fields by `field_name`, multi-clause queries)
 * without this app having to model a grammar it does not own.
 */
export const filterParam: Param = {
  key: "filter",
  label: "Extra filter",
  type: "string",
  advanced: true,
  placeholder: "contact_id>5;custom_score>100",
  hint:
    "Raw Keap filter clauses, joined with `;`. Use `field==value` for equality, a trailing `*` " +
    "for a prefix match, and `> < >= <=` on numeric and date fields. Custom fields are " +
    "addressed by their `field_name` from the resource's `/model` endpoint. Clauses set here " +
    "are appended to the ones above; the encoding is handled for you.",
};

/**
 * `fields` — Keap's sparse-response selector.
 *
 * Several resources **omit** heavy properties unless asked: the v2 Company list
 * documents that `notes`, `fax_number`, `address`, `email_address`,
 * `phone_number`, `update_time`, `create_time` and `custom_fields` "aren't
 * included, by default". So an empty `email_address` on a company is not
 * evidence the company has no email — it is evidence you did not ask for it.
 */
export function fieldsParam(available: string): Param {
  return {
    key: "fields",
    label: "Fields",
    type: "string",
    advanced: true,
    hint: `Comma-separated list of properties to include. ${available}`,
  };
}

/** `priority` on a Task. Copied from the `CreateTaskRequest` enum. */
export const taskPriorityOptions = [
  { value: "CRITICAL", label: "Critical" },
  { value: "ESSENTIAL", label: "Essential" },
  { value: "NONESSENTIAL", label: "Non-essential" },
];

/**
 * `remind_time_mins` on a Task, and `remind_time` on a v1 Appointment.
 *
 * Both are declared `type: integer` with a **string** enum in the source
 * document (`enum: ["5","10",…]`) — a defect in Keap's schema, not a real
 * string field. The values are sent as numbers here, which is what the field's
 * declared type and its `example: 30` both say.
 */
export const reminderMinuteOptions = [
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 240, label: "4 hours before" },
  { value: 480, label: "8 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
];

/**
 * `duplicate_option` on contact create. Copied from the operation's own enum.
 *
 * Supplying it turns `POST /contacts` from a create into an **upsert**: Keap's
 * own wording is "if a match is found using the option provided, the existing
 * contact will be updated". Leaving it empty always creates.
 */
export const duplicateOptions = [
  { value: "Email", label: "Email — match on email address alone" },
  { value: "EmailAndName", label: "Email and name" },
  { value: "EmailAndNameAndCompany", label: "Email, name and company" },
];

/** `status` on an email address, from `RestEmailAddressStatus`. */
export const emailStatusValues = [
  "UNENGAGED_MARKETABLE",
  "SINGLE_OPT_IN",
  "DOUBLE_OPT_IN",
  "CONFIRMED",
  "UNENGAGED_NON_MARKETABLE",
  "NON_MARKETABLE",
  "LOCKDOWN",
  "BOUNCE",
  "HARD_BOUNCE",
  "MANUAL",
  "ADMIN",
  "SYSTEM",
  "LIST_UNSUBSCRIBE",
  "FEEDBACK",
  "SPAM",
  "INVALID",
  "DEACTIVATED",
];

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at every call site.
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

/**
 * Normalise a repeatable id param into a list of non-empty strings.
 *
 * Keap's bulk endpoints (`contacts:applyTags`, `:addContacts`) take
 * `contact_ids` as an array of **strings**, even though every id in this API is
 * numeric. Sending numbers is a 400.
 */
export function toIdList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return raw.map((v) => String(v).trim()).filter(Boolean);
}

/**
 * UTF-8-safe base64, for the two email-body fields that require it.
 *
 * `POST /rest/v2/emails:send` documents `html_content` and `plain_content` as
 * "encoded in Base64", and its examples are base64 (`PGgxPldlbGNvbWU8L2gxPg==`
 * is `<h1>Welcome</h1>`). Posting raw HTML there does not error — it sends,
 * and the recipient gets the literal markup — which is why this is worth a
 * helper rather than a note.
 *
 * `btoa` alone is not enough: it throws on any code point above U+00FF, so a
 * single emoji or accented character in a subject-line-length body would fail.
 * Encoding to UTF-8 bytes first is what makes it correct.
 */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Is this string already base64?
 *
 * Used so a caller who has already encoded their content does not get it
 * double-encoded. Deliberately strict — correct length, correct alphabet, and
 * a round trip through `atob`/`btoa` that reproduces the input exactly.
 * Anything that merely *looks* base64-ish is treated as plain text, because
 * encoding plain text twice is a broken email while treating base64 as plain
 * text is caught by the round trip.
 */
export function looksBase64(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) return false;
  try {
    return btoa(atob(trimmed)) === trimmed;
  } catch {
    return false;
  }
}

/** Encode unless the caller already did. */
export function encodeEmailContent(text: string | undefined): string | undefined {
  if (text === undefined || text === null || text === "") return undefined;
  return looksBase64(text) ? text.trim() : toBase64(text);
}
