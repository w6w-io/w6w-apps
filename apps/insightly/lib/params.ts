import type { Param } from "@w6w/types";

/**
 * Shared params for every `*-get-many` action.
 *
 * Insightly's plain list endpoint (`GET /{Object}`) takes only `top`, `skip`
 * and `brief`; field-level filtering lives on a SEPARATE endpoint,
 * `GET /{Object}/Search`, which additionally takes `field_name`/`field_value`
 * and `updated_after_utc` (all verified against `v3.1/help`'s "Searching and
 * Filtering" section). Rather than expose two actions per object, each
 * `*-get-many` action switches endpoints itself: plain listing when no
 * filter is set, `/Search` the moment one is.
 */
export const listParams: Param[] = [
  {
    key: "fieldName",
    label: "Filter field",
    type: "string",
    row: "filter",
    hint: "A field name to filter on (standard, e.g. LEAD_RATING, or a custom field id). Leave " +
      "blank to list without filtering — switches to the /Search endpoint when set.",
  },
  {
    key: "fieldValue",
    label: "Filter value",
    type: "string",
    row: "filter",
  },
  {
    key: "updatedAfterUtc",
    label: "Updated after (UTC)",
    type: "datetime",
    advanced: true,
    hint: "ISO 8601, e.g. 2026-01-01T00:00:00Z. Only applies when a filter field is set.",
  },
  {
    key: "top",
    label: "Max records",
    type: "number",
    advanced: true,
    hint: "Defaults to 100 records per page; Insightly caps a single response at 500.",
  },
  {
    key: "skip",
    label: "Skip",
    type: "number",
    advanced: true,
    hint: "Number of records to skip, for paging.",
  },
  {
    key: "brief",
    label: "Brief",
    type: "boolean",
    advanced: true,
    hint: "Return only top-level properties (no links, tags, dates, custom fields).",
  },
];

export interface ListInput {
  fieldName?: string;
  fieldValue?: string;
  updatedAfterUtc?: string;
  top?: number;
  skip?: number;
  brief?: boolean;
}

/** Resolve the path + query for a `*-get-many` action from its shared filter params. */
export function listRequest(
  objectPath: string,
  input: ListInput,
): { path: string; query: Record<string, string | number | boolean | undefined> } {
  if (input.fieldName) {
    return {
      path: `/${objectPath}/Search`,
      query: {
        field_name: input.fieldName,
        field_value: input.fieldValue,
        updated_after_utc: input.updatedAfterUtc,
        top: input.top,
        skip: input.skip,
        brief: input.brief,
      },
    };
  }
  return {
    path: `/${objectPath}`,
    query: { top: input.top, skip: input.skip, brief: input.brief },
  };
}
