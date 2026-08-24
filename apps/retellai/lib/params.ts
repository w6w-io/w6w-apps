import type { Option, Param } from "@w6w/types";

/** `sort_order` — shared by every `v2`/`v3` list endpoint that accepts it. */
export const sortOrderOptions: Option[] = [
  { value: "descending", label: "Descending (newest first)" },
  { value: "ascending", label: "Ascending (oldest first)" },
];

export const sortOrderParam: Param = {
  key: "sortOrder",
  label: "Sort order",
  type: "select",
  options: sortOrderOptions,
  default: "descending",
};

/** `limit` + `paginationKey` — the cursor pair every list endpoint accepts, one way or another. */
export function paginationParams(defaultLimit: number, limitHint: string): Param[] {
  return [
    { key: "limit", label: "Limit", type: "number", default: defaultLimit, hint: limitHint },
    {
      key: "paginationKey",
      label: "Pagination key",
      type: "string",
      hint: "Opaque cursor copied from a previous page's Pagination Key output. Leave empty for " +
        "the first page.",
    },
  ];
}

/** Retell's call-status enum, shared by the list-calls filter and every call action's output. */
export const callStatusOptions: Option[] = [
  { value: "registered", label: "Registered" },
  { value: "not_connected", label: "Not connected" },
  { value: "ongoing", label: "Ongoing" },
  { value: "ended", label: "Ended" },
  { value: "error", label: "Error" },
];
