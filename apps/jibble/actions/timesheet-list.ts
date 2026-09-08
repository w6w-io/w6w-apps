import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_ATTENDANCE_HOST } from "../lib/client.ts";

/**
 * `GET /v1/Timesheets` — computed daily totals per person for a Day/Week/Month period
 * starting at `date` — the pre-aggregated counterpart to `time-entry-list`'s raw events.
 *
 * Mixes Jibble's custom `date`/`period`/`searchTerm` params with the standard OData
 * `$filter`/`$expand`/`$orderby`/`$skip`/`$top`/`$count` keywords on the SAME endpoint —
 * unlike the pure-OData list endpoints elsewhere in this app, there is no `$select` here.
 */
interface Input {
  date: string;
  period: "Day" | "Week" | "Month";
  searchTerm?: string;
  filter?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const timesheetList: ActionDefinition<Input> = {
  key: "timesheet-list",
  type: "search",
  resource: "timesheet",
  title: "List Timesheets",
  description: "List computed daily totals per person for a Day, Week or Month period.",
  params: [
    { key: "date", label: "Date", type: "date", required: true, hint: "YYYY-MM-DD. Period start." },
    {
      key: "period",
      label: "Period",
      type: "select",
      required: true,
      default: "Day",
      options: [
        { value: "Day", label: "Day" },
        { value: "Week", label: "Week" },
        { value: "Month", label: "Month" },
      ],
    },
    {
      key: "searchTerm",
      label: "Search",
      type: "string",
      advanced: true,
      hint: "Filter by full name, email, etc.",
    },
    {
      key: "filter",
      label: "Filter ($filter)",
      type: "string",
      advanced: true,
      hint: "e.g. total ne duration'PT0S' to exclude empty days.",
    },
    {
      key: "expand",
      label: "Expand ($expand)",
      type: "string",
      advanced: true,
      hint: "e.g. person.",
    },
    { key: "orderBy", label: "Order by ($orderby)", type: "string", advanced: true },
    { key: "top", label: "Page size ($top)", type: "number", default: 20 },
    { key: "skip", label: "Skip ($skip)", type: "number", default: 0 },
    {
      key: "count",
      label: "Return total count ($count)",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "items", type: "array", label: "Timesheets" },
    { key: "count", type: "number", label: "Total matching rows (only when Count is on)" },
  ],

  async execute(input, ctx) {
    if (!input.date) throw new Error("date is required");
    // `JibbleClient.list` only builds the standard `$`-prefixed OData query, but this endpoint
    // ALSO takes plain `date`/`period`/`searchTerm` keys, so the request is built directly here.
    const body = await new JibbleClient(ctx).json<{ "@odata.count"?: number; value?: unknown[] }>(
      TIME_ATTENDANCE_HOST,
      "/v1/Timesheets",
      {
        query: {
          date: input.date,
          period: input.period ?? "Day",
          searchTerm: input.searchTerm,
          "$filter": input.filter,
          "$expand": input.expand,
          "$orderby": input.orderBy,
          "$top": input.top,
          "$skip": input.skip,
          "$count": input.count ? "true" : undefined,
        },
      },
    );
    return { items: body?.value ?? [], count: body?.["@odata.count"] };
  },
};

export default timesheetList;
