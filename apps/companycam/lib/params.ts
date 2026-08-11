import type { Param } from "@w6w/types";

/**
 * Param builders shared by the actions, and the two pagination rules this API
 * enforces.
 *
 * Everything here is transcribed from CompanyCam's OpenAPI document
 * (`github.com/CompanyCam/openapi-spec`, fetched 2026-08-11); the reasoning for
 * each choice is in the doc comment beside it.
 */

/**
 * Page-number pagination, which every list endpoint accepts.
 *
 * `per_page` is documented with a default of 50 and a **maximum of 100** on the
 * two photo endpoints; the other lists declare no bounds at all. This app
 * prefills 50 everywhere and caps the input at 100, because a limit the vendor
 * enforces on its largest collection is the safest single rule and a rejected
 * request is worse than a smaller page.
 *
 * Note what page-number pagination costs on this API: the body is a bare array
 * with no total and no next-page link, so "was that the last page?" is only
 * answerable by asking for the next one and getting nothing back.
 */
export function pageParams(hint?: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: hint ?? "1-based page number. Responses carry no total, so page past the end " +
          "returns an empty list rather than an error.",
      advanced: true,
    },
    {
      key: "perPage",
      label: "Results per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
      hint: "CompanyCam's own default is 50; 100 is the documented maximum on the photo " +
        "endpoints and is applied here to every list.",
      advanced: true,
    },
  ];
}

/**
 * Cursor pagination — **only** for `GET /v2/photos` and
 * `GET /v2/projects/{id}/photos`, the two endpoints that document it.
 *
 * The cursor values do not appear in the response body (which is a bare array).
 * They arrive as the `X-Next-Cursor` / `X-Prev-Cursor` headers, which this app
 * surfaces as the `nextCursor` / `prevCursor` outputs — so a workflow pages by
 * feeding one step's `nextCursor` into the next step's `after`.
 */
export function cursorParams(): Param[] {
  return [
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint: "The previous call's `nextCursor` output. Cannot be combined with Page or Before.",
      advanced: true,
    },
    {
      key: "before",
      label: "Before cursor",
      type: "string",
      hint: "The previous call's `prevCursor` output. Cannot be combined with Page or After.",
      advanced: true,
    },
  ];
}

/** Capture-time window, expressed the way the vendor expects it. */
export function capturedRangeParams(noun: string): Param[] {
  return [
    {
      key: "startDate",
      label: "Captured on or after",
      type: "string",
      hint: `Unix timestamp in seconds. Returns ${noun} captured at or after this instant.`,
      advanced: true,
    },
    {
      key: "endDate",
      label: "Captured on or before",
      type: "string",
      hint: `Unix timestamp in seconds. Returns ${noun} captured at or before this instant.`,
      advanced: true,
    },
  ];
}

/**
 * The `*_ids` filters, exposed as **one id each**.
 *
 * The OpenAPI document types these as arrays but declares no `style`/`explode`,
 * and the vendor's own generated Postman collection sends a single scalar value
 * per key. A Rails backend parses `?user_ids=1&user_ids=2` as the *last* value
 * only, `?user_ids[]=1&user_ids[]=2` as a list, and `?user_ids=1,2` as a
 * string — three incompatible readings, none of them documented, and the wrong
 * one fails silently by returning results for one id instead of erroring.
 *
 * A single value is the one form that behaves identically under all three, so
 * that is what this app sends. Multi-id filtering is left out rather than
 * guessed; the README says so.
 */
export function idFilterParams(
  filters: Array<{ key: string; label: string; hint: string }>,
): Param[] {
  return filters.map(({ key, label, hint }) => ({
    key,
    label,
    type: "string" as const,
    hint: `${hint} One id only — see the README on why multiple ids are not sent.`,
    advanced: true,
  }));
}

/**
 * The impersonation param, offered on exactly the 14 operations whose OpenAPI
 * definition declares the header.
 *
 * It is an email address, not a credential: it names an existing user in the
 * same company to credit for the write, and the request is still authenticated
 * by the connection's own token.
 */
export const actAsParam: Param = {
  key: "actAs",
  label: "Attribute to user (email)",
  type: "string",
  hint: "CompanyCam email address of the user to record as the creator. Leave empty to credit " +
    "the connection's own user. An unknown or misspelled address is ignored silently rather " +
    "than rejected.",
  advanced: true,
};

/** Every list action reports the same three fields; the photo lists add cursors. */
export const listOutput = [
  { key: "items", type: "array" as const, label: "Results in this page" },
  { key: "count", type: "number" as const, label: "Results in this page" },
];

/** The four cursor outputs, for the two endpoints that publish them. */
export const cursorOutput = [
  { key: "nextCursor", type: "string" as const, label: "Cursor for the next page" },
  { key: "prevCursor", type: "string" as const, label: "Cursor for the previous page" },
  { key: "hasNext", type: "boolean" as const, label: "More results after this page" },
  { key: "hasPrev", type: "boolean" as const, label: "Results before this page" },
];

/**
 * Reject the pagination combinations the vendor documents as illegal.
 *
 * "Cannot be used with cursor pagination (after/before params)" for `page`, and
 * "Cannot be used with 'before' or 'page'" for `after`. Sending both is
 * undefined behaviour, and undefined behaviour on a pagination parameter means
 * a workflow silently re-reads page one forever.
 */
export function paginationQuery(input: {
  page?: number;
  perPage?: number;
  after?: string;
  before?: string;
}): Record<string, string | number | undefined> {
  const { page, perPage, after, before } = input;
  if (after && before) {
    throw new Error("Set only one of After cursor or Before cursor");
  }
  if (page !== undefined && page !== null && (after || before)) {
    throw new Error("Page cannot be combined with a cursor — use one or the other");
  }
  return { page, per_page: perPage, after, before };
}
