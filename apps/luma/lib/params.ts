import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments, copied field-for-field from Luma's OpenAPI 3.1
 * document (`public-api.luma.com/openapi.json`, fetched 2026-09-01), not
 * inferred.
 */

/**
 * `sort_direction` — shared verbatim by every list endpoint in this app
 * (`events/list`, `guests/list`, `contacts/list`). Note the two "nulls last"
 * members carry a literal space, not a hyphen — copied exactly as Luma's enum
 * states it.
 */
export const sortDirectionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
  { value: "asc nulls last", label: "Ascending, nulls last" },
  { value: "desc nulls last", label: "Descending, nulls last" },
];

export const sortDirectionParam: Param = {
  key: "sortDirection",
  label: "Sort direction",
  type: "select",
  options: sortDirectionOptions,
};

/**
 * `pagination_cursor` / `pagination_limit` — the cursor-paging pair every list
 * endpoint in this app accepts. Luma states no default or maximum for the
 * limit ("The server will enforce a maximum number"), so none is guessed here.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "paginationLimit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Number of items to return. Luma enforces its own server-side maximum.",
    },
    {
      key: "paginationCursor",
      label: "Pagination cursor",
      type: "string",
      hint: "Value of `next_cursor` from a previous call to page forward.",
    },
  ];
}

/** `event_id` — required on almost every event-scoped read and write. */
export const eventIdParam: Param = {
  key: "eventId",
  label: "Event",
  type: "string",
  required: true,
  placeholder: "evt-abc123",
  hint: "Event ID, usually starting with `evt-`.",
};

/**
 * The guest identifier Luma accepts across `guests/get`, `guests/update-status`
 * and `guests/update-tickets` — four interchangeable forms per the vendor's own
 * parameter description.
 */
export const guestIdParam: Param = {
  key: "guestId",
  label: "Guest",
  type: "string",
  required: true,
  hint: "The guest ID (gst-), a ticket key, a guest key (g-), or the guest's email.",
};

export const eventTicketTypeIdParam: Param = {
  key: "eventTicketTypeId",
  label: "Ticket type",
  type: "string",
  required: true,
  placeholder: "ttype-abc123",
  hint: "Ticket type ID, usually starting with `ttype-`.",
};

/** ISO 8601 datetime hint, shared verbatim across every date-time param Luma documents. */
export const ISO_DATETIME_HINT = "ISO 8601 datetime, e.g. 2022-10-19T03:27:13.673Z.";
