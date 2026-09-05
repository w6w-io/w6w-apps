import type { Param } from "@w6w/types";

export const issueKey: Param = {
  key: "issueKey",
  label: "Issue key or ID",
  type: "string",
  required: true,
  placeholder: "ENG-42",
  hint: "The key shown in the UI (`ENG-42`) or the numeric issue id.",
};

/** Jira Data Center's offset pagination — the same shape every list endpoint here takes. */
export const pagination: Param[] = [
  {
    key: "maxResults",
    label: "Max results",
    type: "number",
    default: 50,
    row: "page",
    validation: { min: 1, max: 1000, integer: true },
  },
  {
    key: "startAt",
    label: "Start at",
    type: "number",
    default: 0,
    row: "page",
    validation: { min: 0, integer: true },
    hint: "Zero-based offset of the first result.",
  },
];

export const issueOutput = [
  { key: "id", type: "string" as const, label: "Issue ID" },
  { key: "key", type: "string" as const, label: "Issue key (e.g. ENG-42)" },
  { key: "self", type: "string" as const, label: "API URL" },
  { key: "fields", type: "object" as const, label: "Fields" },
];
