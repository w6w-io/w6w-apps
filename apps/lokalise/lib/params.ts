import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Lokalise actions.
 *
 * Verified against Lokalise's OpenAPI 3.0.3 document (fetched 2026-09-01 from
 * `developers.lokalise.com/openapi/lokalise-api-without-branches.yml`).
 */

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project",
  type: "string",
  required: true,
  placeholder: "3002780358964f9bab5a92.87762498",
  hint:
    "The project's identifier, from Lokalise's project settings or the `project_id` field of a " +
    "List Projects response.",
};

export const keyIdParam: Param = {
  key: "keyId",
  label: "Key ID",
  type: "number",
  required: true,
  hint: "Numeric key id, from the `key_id` field of a key.",
};

/**
 * The offset/cursor pagination fields, shared by every list endpoint.
 *
 * `limit` defaults to a small value here rather than Lokalise's own default
 * (which varies by endpoint and can be as high as 5000), for the same reason
 * every list-heavy app in this pack does it: a workflow step that silently
 * returns thousands of rows is a footgun, not a convenience.
 */
export function paginationParams(defaultLimit = 100, maxLimit = 5000): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: maxLimit },
      hint: `Number of items to include (Lokalise's own ceiling on this endpoint is ${maxLimit}).`,
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint:
        "Return results starting from this page (offset pagination only — the default). Ignored " +
        "if Cursor is set.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint:
        "Return results starting from this cursor (from a previous call's `nextCursor` output). " +
        "Switches this call to cursor pagination, which is faster on large projects but does not " +
        "report a total count.",
    },
  ];
}

/** Build the query object shared by every paginated list action. */
export interface PaginationInput {
  limit?: number;
  page?: number;
  cursor?: string;
}

export function paginationQuery(input: PaginationInput): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (input.limit !== undefined) query.limit = input.limit;
  if (input.cursor) {
    query.pagination = "cursor";
    query.cursor = input.cursor;
  } else if (input.page !== undefined) {
    query.page = input.page;
  }
  return query;
}

/**
 * `Language ISO` — Lokalise's own identifier for a language within a project.
 * Not always a bare ISO 639-1 code: locale-qualified forms like `en_GB` are
 * common, and a project can define a `custom_iso` that differs from both.
 */
export const langIsoParam: Param = {
  key: "langIso",
  label: "Language ISO code",
  type: "string",
  required: true,
  placeholder: "en",
  hint:
    "The language's `lang_iso` (or its project-level `custom_iso` override), e.g. `en`, `en_GB`.",
};
