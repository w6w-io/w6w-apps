/**
 * Param fragments shared by the actions.
 *
 * Every action addresses a workspace, and several share the workspace-scoped
 * resource shapes (report/dataset/dashboard summaries). Declaring those once
 * keeps eighteen actions honest with each other. Each helper returns a fresh
 * array/object, evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` / `Output[]` on every action.
 */
import type { Param } from "@w6w/types";

/**
 * Which workspace. Leaving it empty means "My workspace" — Power BI's own
 * convention of omitting the `/groups/{id}` path segment, not a separate
 * endpoint. See `../lib/client.ts`'s `groupPath()`.
 */
export const groupIdParam: Param = {
  key: "groupId",
  label: "Workspace ID",
  type: "string",
  placeholder: "f089354e-8366-4e18-aea3-4cb4a3a50b48",
  hint:
    "The workspace's GUID (from List Workspaces). Leave empty to use 'My workspace' — the caller's own workspace.",
};

/** `$top` / `$skip` — the only paging Power BI's collections support (no continuation cursor). */
export function pagingParams(): Param[] {
  return [
    {
      key: "top",
      label: "Max results",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "OData `$top` — return at most this many results.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "OData `$skip` — skip this many results before returning any.",
    },
  ];
}

/** The report properties worth surfacing by default. */
export const reportOutput = [
  { key: "id", type: "string" as const, label: "Report ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "datasetId", type: "string" as const, label: "Dataset ID" },
  { key: "webUrl", type: "string" as const, label: "Web URL" },
  { key: "embedUrl", type: "string" as const, label: "Embed URL" },
];

/** The dataset properties worth surfacing by default. */
export const datasetOutput = [
  { key: "id", type: "string" as const, label: "Dataset ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "configuredBy", type: "string" as const, label: "Configured by" },
  { key: "isRefreshable", type: "boolean" as const, label: "Is refreshable" },
  { key: "addRowsAPIEnabled", type: "boolean" as const, label: "Push-dataset rows API enabled" },
];

/** The dashboard properties worth surfacing by default. */
export const dashboardOutput = [
  { key: "id", type: "string" as const, label: "Dashboard ID" },
  { key: "displayName", type: "string" as const, label: "Display name" },
  { key: "embedUrl", type: "string" as const, label: "Embed URL" },
  { key: "isReadOnly", type: "boolean" as const, label: "Is read-only" },
];

/** The workspace (`group`) properties worth surfacing by default. */
export const workspaceOutput = [
  { key: "id", type: "string" as const, label: "Workspace ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "isReadOnly", type: "boolean" as const, label: "Is read-only" },
  { key: "isOnDedicatedCapacity", type: "boolean" as const, label: "On dedicated capacity" },
  { key: "capacityId", type: "string" as const, label: "Capacity ID" },
];

/** The `value`-shaped output every collection action returns. */
export function listOutput(itemLabel: string) {
  return [{ key: "value", type: "array" as const, label: itemLabel }];
}
