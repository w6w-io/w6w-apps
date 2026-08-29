import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Pinterest actions.
 *
 * Every enum here is copied from Pinterest's own OpenAPI 3.0 description
 * (`github.com/pinterest/api-description`, `v5/openapi.json`, fetched
 * 2026-08-29), not inferred.
 */

/** `BoardPrivacy` — `board-create`. */
export const boardPrivacyOptions = [
  { value: "PUBLIC", label: "Public" },
  { value: "PROTECTED", label: "Protected" },
  { value: "SECRET", label: "Secret" },
];

/**
 * `BoardUpdatePrivacy` — `board-update`. Narrower than create: Pinterest's own
 * schema does not allow updating a board TO `PROTECTED` (only `PUBLIC` or
 * `SECRET`), so this is a distinct, shorter list rather than the create one
 * reused.
 */
export const boardUpdatePrivacyOptions = [
  { value: "PUBLIC", label: "Public" },
  { value: "SECRET", label: "Secret" },
];

export const boardIdParam: Param = {
  key: "boardId",
  label: "Board",
  type: "string",
  required: true,
  placeholder: "549755885175",
  hint: "The board's numeric ID.",
};

export const pinIdParam: Param = {
  key: "pinId",
  label: "Pin",
  type: "string",
  required: true,
  placeholder: "331794993059048200",
  hint: "The Pin's numeric ID.",
};

/**
 * `ad_account_id` — present on almost every read/write endpoint in this app.
 * Optional everywhere: absent, the "operation user_account" is the token's
 * own account; set it (per Pinterest's Business Access model) to act as the
 * account that owns that ad account instead.
 */
export const adAccountIdParam: Param = {
  key: "adAccountId",
  label: "Ad account (Business Access)",
  type: "string",
  advanced: true,
  hint: "Leave empty to act as the connected account. If the connected account has Business " +
    "Access to another account's ad account, set its ID here to act as that account's owner " +
    "instead.",
};

/** The bookmark/page_size pair every list endpoint in this app uses (cursor pagination). */
export function paginationParams(): Param[] {
  return [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 250 },
      hint: "Pinterest's own default is 25, maximum 250.",
    },
    {
      key: "bookmark",
      label: "Bookmark (page cursor)",
      type: "string",
      advanced: true,
      hint: "Opaque cursor from a previous page's response. Leave empty for the first page.",
    },
  ];
}

export interface PaginationInput {
  pageSize?: number;
  bookmark?: string;
}

export function paginationQuery(
  input: PaginationInput,
): Record<string, string | number | undefined> {
  return { page_size: input.pageSize, bookmark: input.bookmark };
}
