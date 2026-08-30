import type { Param } from "@w6w/types";

/**
 * Teamwork's `page` / `pageSize` pagination, the form every V3 list endpoint
 * takes. Verified against
 * apidocs.teamwork.com/guides/teamwork/how-does-paging-work: `pageSize`
 * defaults to 50 and caps at 500 for most V3 endpoints; the response carries
 * `meta.page.{pageOffset,pageSize,count,hasMore}` alongside the legacy
 * `x-page` / `x-pages` / `x-records` headers.
 */
export const pagination: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    row: "page",
    validation: { min: 1, integer: true },
  },
  {
    key: "pageSize",
    label: "Per page",
    type: "number",
    default: 50,
    row: "page",
    advanced: true,
    validation: { min: 1, max: 500, integer: true },
    hint: "Teamwork caps this at 500 for most V3 endpoints.",
  },
];

export const projectOutput = [
  { key: "id", type: "number" as const, label: "Project ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "status", type: "string" as const, label: "Status" },
];

export const taskOutput = [
  { key: "id", type: "number" as const, label: "Task ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "status", type: "string" as const, label: "Status" },
  { key: "progress", type: "number" as const, label: "Progress %" },
];

/**
 * Not a documented enum — apidocs.teamwork.com/docs/teamwork's `task.Task`
 * schema types `priority` as an opaque nullable string with no `enum` list.
 * "low" / "medium" / "high" is the value set Teamwork's own V1 task-list
 * template body documents for the equivalent `priorityText` field
 * ("low, medium, high prority of the tasks"), so it is left as free text
 * here rather than a hard-coded `select` that could reject a value the API
 * actually accepts.
 */
export const priorityHint =
  "low, medium, or high — Teamwork's task priority values. Leave blank for none.";
