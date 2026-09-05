import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the AWeber actions.
 *
 * Field names and enums are copied from AWeber's own OpenAPI 3.0.2 document
 * (fetched 2026-09-05 from the embedded Redoc state at `https://api.aweber.com/`),
 * not inferred.
 */

export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  required: true,
  hint: "The AWeber customer account id. Use the account-list action to look it up — most " +
    "developer accounts have exactly one.",
};

export const listIdParam: Param = {
  key: "listId",
  label: "List ID",
  type: "string",
  required: true,
  hint: "The numeric list id, from list-list or the list's own self_link.",
};

export const subscriberIdParam: Param = {
  key: "subscriberId",
  label: "Subscriber ID",
  type: "string",
  required: true,
  hint: "The subscriber's numeric id (the `id` field of a Subscriber, not their email).",
};

export const customFieldIdParam: Param = {
  key: "customFieldId",
  label: "Custom Field ID",
  type: "string",
  required: true,
};

export const broadcastIdParam: Param = {
  key: "broadcastId",
  label: "Broadcast ID",
  type: "string",
  required: true,
};

export const segmentIdParam: Param = {
  key: "segmentId",
  label: "Segment ID",
  type: "string",
  required: true,
};

/**
 * `ws.start` / `ws.size` — AWeber's own pagination keys, not `offset`/`limit`
 * and not a page number. `ws.size` maxes out at 100, which is also the
 * documented default, so unlike Apify's 1,000-row default this one is
 * already a reasonable ceiling and is left at the vendor's own default
 * rather than pre-shrunk.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "start",
      label: "Start offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Sent as ws.start. Number of entries to skip from the beginning of the collection.",
    },
    {
      key: "size",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Sent as ws.size. Maximum (and default) is 100.",
    },
  ];
}

export interface Pagination {
  start?: number;
  size?: number;
}

/** Build the `ws.start` / `ws.size` query pair from {@link paginationParams} input. */
export function paginationQuery(input: Pagination): Record<string, number | undefined> {
  return { "ws.start": input.start, "ws.size": input.size };
}

export const subscriberStatusOptions = [
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "unconfirmed", label: "Unconfirmed" },
];

/**
 * `UpdateSubscriberRequestBody.status` accepts only these two — AWeber's own
 * note: "you cannot set a subscriber's status to unconfirmed" via the API.
 */
export const subscriberWritableStatusOptions = [
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

/**
 * `GET .../broadcasts` requires this filter — there is no "all broadcasts"
 * call. `draft` only returns drafts the API itself created (see
 * `actions/broadcast-create.ts`).
 */
export const broadcastStatusOptions = [
  { value: "draft", label: "Draft (API-created only)" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
];

export const sortOrderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

/** `custom_fields` is a JSON object of string values; accepted as a `json` param. */
export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: 'Object of custom field name to string value, e.g. {"Favorite color": "blue"}. The ' +
    "field must already exist on the list — see the custom-field actions.",
};

/** Accept a `json`-typed param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}
