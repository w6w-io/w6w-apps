import type { Param } from "@w6w/types";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "./client.ts";

/**
 * Shared `Param` fragments and option lists for the Brex actions.
 *
 * Every enum here is copied from Brex's own OpenAPI pages (read 2026-09-22), not
 * inferred. Where the vendor documents one enum for reading and a narrower one
 * for writing, both are here and named for which is which — the user-status
 * filter accepts six statuses, while an update accepts two.
 */

/**
 * Cursor pagination, which every Brex list endpoint shares.
 *
 * `limit` carries the vendor's real ceiling: >1000 is a documented `400`. The
 * default is prefilled at Brex's own default of 100 rather than left blank, so a
 * workflow step's page size is visible in the form instead of implied by the
 * API.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: DEFAULT_PAGE_LIMIT,
      validation: { integer: true, min: 1, max: MAX_PAGE_LIMIT },
      hint:
        `Rows per page. Defaults to ${DEFAULT_PAGE_LIMIT} and may not exceed ${MAX_PAGE_LIMIT} — ` +
        "Brex answers `400` above that.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint:
        "Opaque cursor from a previous page's `next_cursor`. Leave empty for the first page. The " +
        "page's `next_cursor` is `null` once the end of the set is reached.",
    },
  ];
}

/**
 * `Idempotency-Key` — optional on every POST and PUT here.
 *
 * Sent verbatim as the header when set, and **only** then: the app never
 * synthesises a value, so a create with no key is a create that a retry repeats,
 * and the hints on the create actions say so. Pass the same key on a retry to
 * get Brex's own deduplication instead.
 */
export const idempotencyKeyParam: Param = {
  key: "idempotencyKey",
  label: "Idempotency key",
  type: "string",
  advanced: true,
  hint:
    "Optional, forwarded verbatim as the `Idempotency-Key` header. Set it before the first call " +
    "and reuse the same value on a retry and Brex returns the resource it already created instead " +
    "of creating a second one. The app does not invent a value, so leaving this empty means a " +
    "retry acts again.",
};

/**
 * `status` on `PUT /v2/users/{id}` — the two statuses an update accepts.
 *
 * Brex: "To suspend a user, set status to 'disabled'. To unsuspend a user, set
 * status to 'active'." The narrower read: this is NOT the six-value filter enum
 * below, and sending one of those is not a documented request.
 */
export const userStatusUpdateOptions = [
  { value: "ACTIVE", label: "Active — unsuspends a suspended user" },
  { value: "DISABLED", label: "Disabled — suspends the user" },
];

/**
 * `status[]` on `GET /v2/users` — the six-value filter enum.
 *
 * Brex notes that deleted and archived users are excluded by default, so
 * `ARCHIVED` here is how a caller asks for them.
 */
export const userStatusFilterOptions = [
  { value: "INVITED", label: "Invited" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
  { value: "PENDING_ACTIVATION", label: "Pending activation" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived — excluded unless asked for explicitly" },
];

/**
 * The `reason` enum shared by `POST /v2/cards/{id}/lock` and
 * `POST /v2/cards/{id}/terminate`.
 *
 * Required on both, and Brex emails the card owner when it is used, so it is a
 * required param here rather than a defaulted one.
 */
export const cardReasonOptions = [
  { value: "CARD_DAMAGED", label: "Card damaged" },
  { value: "CARD_LOST", label: "Card lost" },
  { value: "CARD_NOT_RECEIVED", label: "Card not received" },
  { value: "DO_NOT_NEED_PHYSICAL_CARD", label: "Do not need physical card" },
  { value: "DO_NOT_NEED_VIRTUAL_CARD", label: "Do not need virtual card" },
  { value: "FRAUD", label: "Fraud" },
  { value: "OTHER", label: "Other" },
];

/** `spend_controls.spend_duration` — how often a card's spend limit refreshes. */
export const spendDurationOptions = [
  { value: "MONTHLY", label: "Monthly — the limit refreshes every month" },
  { value: "QUARTERLY", label: "Quarterly — refreshes every quarter" },
  { value: "YEARLY", label: "Yearly — refreshes every year" },
  { value: "ONE_TIME", label: "One time — the limit does not refresh" },
];

/** `load_custom_fields` — shared by the three user reads, spelled as Brex spells it. */
export const loadCustomFieldsParam: Param = {
  key: "loadCustomFields",
  label: "Load custom field values",
  type: "boolean",
  hint:
    "Brex's `load_custom_fields`. Off by default, matching the API: the user's `custom_fields` " +
    "array is only populated when this is on.",
};

/** The path id of a user. */
export const userIdParam: Param = {
  key: "id",
  label: "User",
  type: "string",
  required: true,
  hint: "Brex user id — the `id` field of a List Users or Get Current User result.",
};

/** The path id of a card. */
export const cardIdParam: Param = {
  key: "id",
  label: "Card",
  type: "string",
  required: true,
  hint: "Brex card id — the `id` field of a List Cards or Get Card result.",
};

/** The path id of a legal entity. */
export const legalEntityIdParam: Param = {
  key: "id",
  label: "Legal entity",
  type: "string",
  required: true,
  hint: "Brex legal entity id — the `id` field of a List Legal Entities result.",
};

/** The path id of a location, department or title. */
export function namedResourceIdParam(label: string): Param {
  return {
    key: "id",
    label,
    type: "string",
    required: true,
    hint: `Brex ${label.toLowerCase()} id — the \`id\` field of the matching list action's result.`,
  };
}

/** The path ids of the three named directory resources. */
export const locationIdParam: Param = namedResourceIdParam("Location");
export const departmentIdParam: Param = namedResourceIdParam("Department");
export const titleIdParam: Param = namedResourceIdParam("Title");
