import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_ATTENDANCE_HOST, toList } from "../lib/client.ts";

/**
 * `GET /v1/TrackedTimeReport` — the generic cross-team attendance report, grouped and
 * optionally sub-grouped by Date/Member/Client/Project/Activity.
 *
 * ## The filter params are documented under TWO casings on the same endpoint
 *
 * The collection's own example lists `personids` and `personIds` as two SEPARATE query
 * parameters on the same request (its description literally reads "Person Ids by which to
 * filter" / "Another person Ids by which to filter"). OData query keys are case-sensitive, so
 * these are not typos of each other from Jibble's point of view — only `personIds` (the form
 * every other endpoint in this API uses) is sent here; `personids` is not exposed.
 *
 * Use `$expand=Subject,Items($expand=Subject)` (passed as `expand` below) to inline the
 * entities the data is grouped by, exactly as the vendor's own example does.
 */
interface Input {
  from: string;
  to: string;
  groupBy: "Date" | "Member" | "Client" | "Project" | "Activity";
  subGroupBy: "None" | "Date" | "Member" | "Client" | "Project" | "Activity";
  expand?: string;
  personIds?: string[] | string;
  projectIds?: string[] | string;
  activityIds?: string[] | string;
  clientIds?: string[] | string;
  groupIds?: string[] | string;
  locationIds?: string[] | string;
  scheduleIds?: string[] | string;
}

const trackedTimeReportGet: ActionDefinition<Input> = {
  key: "tracked-time-report-get",
  type: "search",
  resource: "report",
  title: "Get Tracked Time Report",
  description: "Cross-team tracked-time report, grouped and optionally sub-grouped.",
  params: [
    { key: "from", label: "From", type: "date", required: true, row: "range" },
    { key: "to", label: "To", type: "date", required: true, row: "range" },
    {
      key: "groupBy",
      label: "Group by",
      type: "select",
      required: true,
      default: "Member",
      row: "grouping",
      options: [
        { value: "Date", label: "Date" },
        { value: "Member", label: "Member" },
        { value: "Client", label: "Client" },
        { value: "Project", label: "Project" },
        { value: "Activity", label: "Activity" },
      ],
    },
    {
      key: "subGroupBy",
      label: "Sub-group by",
      type: "select",
      required: true,
      default: "None",
      row: "grouping",
      options: [
        { value: "None", label: "None" },
        { value: "Date", label: "Date" },
        { value: "Member", label: "Member" },
        { value: "Client", label: "Client" },
        { value: "Project", label: "Project" },
        { value: "Activity", label: "Activity" },
      ],
    },
    {
      key: "expand",
      label: "Expand ($expand)",
      type: "string",
      advanced: true,
      hint: "e.g. Subject,Items($expand=Subject) to inline the grouped entities.",
    },
    {
      key: "personIds",
      label: "Filter by Person IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
    {
      key: "projectIds",
      label: "Filter by Project IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
    {
      key: "activityIds",
      label: "Filter by Activity IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
    {
      key: "clientIds",
      label: "Filter by Client IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
    { key: "groupIds", label: "Filter by Group IDs", type: "string", repeat: true, advanced: true },
    {
      key: "locationIds",
      label: "Filter by Location IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
    {
      key: "scheduleIds",
      label: "Filter by Schedule IDs",
      type: "string",
      repeat: true,
      advanced: true,
    },
  ],
  output: [{ key: "items", type: "array", label: "Grouped report rows" }],

  async execute(input, ctx) {
    if (!input.from) throw new Error("from is required");
    if (!input.to) throw new Error("to is required");
    if (!input.groupBy) throw new Error("groupBy is required");
    if (!input.subGroupBy) throw new Error("subGroupBy is required");

    const body = await new JibbleClient(ctx).json<{ value?: unknown[]; items?: unknown[] }>(
      TIME_ATTENDANCE_HOST,
      "/v1/TrackedTimeReport",
      {
        query: {
          from: input.from,
          to: input.to,
          groupBy: input.groupBy,
          subGroupBy: input.subGroupBy,
          "$expand": input.expand,
          personIds: toList(input.personIds),
          projectIds: toList(input.projectIds),
          activityIds: toList(input.activityIds),
          clientIds: toList(input.clientIds),
          groupIds: toList(input.groupIds),
          locationIds: toList(input.locationIds),
          scheduleIds: toList(input.scheduleIds),
        },
      },
    );
    return { items: body?.value ?? body?.items ?? [] };
  },
};

export default trackedTimeReportGet;
