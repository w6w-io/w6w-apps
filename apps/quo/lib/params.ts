import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param`/`OutputField` fragments reused across the Quo actions, so a filter or
 * pagination field means the same thing (and validates the same way) everywhere it appears.
 */

/** `maxResults` — required on calls/messages/contacts/conversations, optional on users. */
export function maxResultsParam(opts: { required?: boolean; hint?: string } = {}): Param {
  return {
    key: "maxResults",
    label: "Max results",
    type: "number",
    required: opts.required ?? true,
    default: 10,
    validation: { integer: true, min: 1, max: 100 },
    hint: opts.hint ?? "Maximum number of results per page (1-100). Defaults to 10.",
  };
}

/** Opaque cursor from a previous page's `nextPageToken`. */
export const pageTokenParam: Param = {
  key: "pageToken",
  label: "Page token",
  type: "string",
  advanced: true,
  hint: "The `nextPageToken` from a previous page's response, to fetch the next page.",
};

/** Restrict results to one workspace member. */
export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  advanced: true,
  placeholder: "US123abc",
  hint: "The unique identifier of a Quo user.",
};

/** Required for actions scoped to one Quo number. */
export const phoneNumberIdParam: Param = {
  key: "phoneNumberId",
  label: "Phone number ID",
  type: "string",
  required: true,
  placeholder: "PN123abc",
  hint: "The unique identifier of the Quo phone number.",
};

/** ISO 8601 date-time filters shared by calls/messages/conversations list actions. */
export const createdAfterParam: Param = {
  key: "createdAfter",
  label: "Created after",
  type: "datetime",
  advanced: true,
  hint: "Only include results created after this date and time (ISO 8601).",
};

export const createdBeforeParam: Param = {
  key: "createdBefore",
  label: "Created before",
  type: "datetime",
  advanced: true,
  hint: "Only include results created before this date and time (ISO 8601).",
};

/** Cursor-paginated list responses share this envelope shape (except phone-numbers/webhooks). */
export const paginationOutputFields: OutputField[] = [
  { key: "totalItems", type: "number", label: "Total matching items" },
  { key: "nextPageToken", type: "string", label: "Cursor for the next page (null at the end)" },
];

/**
 * The four `POST /v1/webhooks/*` create endpoints share every field except each one's fixed
 * `events` enum, passed in here as `eventOptions` so the multiselect only ever offers values
 * that endpoint actually accepts. `resourceIds` accepts either specific phone number IDs or the
 * literal single-element array `["*"]` (all phone numbers) — modeled here as free-form strings
 * rather than a fixed select, since `"*"` is just one more string value a user can type.
 */
export function webhookCreateParams(
  eventOptions: Array<{ value: string; label: string }>,
): Param[] {
  return [
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: eventOptions,
      default: eventOptions.map((o) => o.value),
      hint: "Which event types this webhook subscribes to.",
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/webhooks/quo",
      hint: "The endpoint that receives events from this webhook.",
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      hint: "A human-readable label for this webhook subscription.",
    },
    {
      key: "resourceIds",
      label: "Phone number IDs",
      type: "array",
      advanced: true,
      item: { type: "string", placeholder: "PN123abc" },
      hint: "Phone number IDs this webhook covers. Pass a single item, `*`, to cover every " +
        "phone number in the workspace.",
    },
    {
      key: "userId",
      label: "Created by user ID",
      type: "string",
      advanced: true,
      placeholder: "US123abc",
      hint: "The user that creates the webhook. Defaults to the workspace owner.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      advanced: true,
      default: "enabled",
      options: [
        { value: "enabled", label: "Enabled" },
        { value: "disabled", label: "Disabled" },
      ],
    },
  ];
}

export const webhookOutputFields: OutputField[] = [
  {
    key: "data",
    type: "object",
    label: "Webhook (id, userId, orgId, label, status, url, key, events, resourceIds, " +
      "createdAt, updatedAt, deletedAt)",
  },
];
