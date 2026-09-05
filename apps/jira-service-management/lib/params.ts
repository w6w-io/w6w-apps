import type { Param } from "@w6w/types";

export const serviceDeskId: Param = {
  key: "serviceDeskId",
  label: "Service Desk ID",
  type: "string",
  required: true,
  hint: "From `servicedesk-get-many` — the numeric id, not the project key.",
};

export const issueIdOrKey: Param = {
  key: "issueIdOrKey",
  label: "Request ID or key",
  type: "string",
  required: true,
  placeholder: "HELPDESK-1",
  hint: "The key shown in the portal (`HELPDESK-1`) or the numeric issue id.",
};

/** JSM's offset pagination — every list endpoint takes the same two params. */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    row: "page",
    validation: { min: 1, integer: true },
    hint: "Items per page.",
  },
  {
    key: "start",
    label: "Start",
    type: "number",
    default: 0,
    row: "page",
    validation: { min: 0, integer: true },
    hint: "Zero-based offset of the first result.",
  },
];

export const pagedOutput = [
  { key: "values", type: "array" as const, label: "Items" },
  { key: "size", type: "number" as const, label: "Items in this page" },
  { key: "start", type: "number" as const, label: "Offset of this page" },
  { key: "isLastPage", type: "boolean" as const, label: "Whether this is the last page" },
];
