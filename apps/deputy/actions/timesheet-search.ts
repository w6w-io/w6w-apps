import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import { buildQueryBody, QUERY_PARAMS, type QueryInput, searchPage } from "../lib/params.ts";

/**
 * `POST /resource/Timesheet/QUERY` — filter, sort and page timesheets.
 *
 * This is the read the reference points at for the table it matters most on:
 * *"Returns Timesheet records the authenticated caller is permitted to see. For
 * large tables prefer POST /QUERY with pagination."* A timesheet table is the
 * one thing in a Deputy install that is reliably too big for a single response,
 * so the intended use is a date-range clause plus paging — Deputy's own
 * changelog carries a recipe called "Search for employee timesheets in a date
 * period" for exactly this shape.
 *
 * Timestamps are Unix seconds, which is how the `Timesheet` schema types
 * `StartTime`/`EndTime`, so a range clause looks like
 * `{"s1":{"field":"StartTime","data":1758384000,"type":"ge"},
 *   "s2":{"field":"StartTime","data":1758470400,"type":"lt"}}`.
 * `join: "EmployeeObject,OperationalUnitObject"` expands the employee and the
 * area inline — the two things a timesheet report almost always needs and the
 * two ids it otherwise returns bare.
 */
interface Input extends QueryInput {
  search?: unknown;
  sort?: unknown;
  join?: string;
  max?: number;
  cursor?: number;
}

const action: ActionDefinition<Input> = {
  key: "timesheet-search",
  type: "search",
  resource: "timesheet",
  title: "Search timesheets",
  description:
    "Filter, sort and page timesheets with Deputy's own QUERY body — the documented way to " +
    "read a date range out of a install whose timesheet table is far larger than 500 rows.",
  params: QUERY_PARAMS,
  output: [
    { key: "items", type: "array", label: "Timesheet records" },
    { key: "count", type: "number", label: "Records in this page" },
    { key: "start", type: "number", label: "Offset this page started at" },
    { key: "max", type: "number", label: "Page size requested" },
    {
      key: "nextCursor",
      type: "number",
      label: "Offset to pass back as cursor (absent when the table ended)",
    },
  ],

  async execute(input, ctx) {
    ctx.log("info", "searching Deputy timesheets", { max: input.max, cursor: input.cursor });
    const items = await new DeputyClient(ctx).query<Record<string, unknown>>(
      "Timesheet",
      buildQueryBody(input),
    );
    return searchPage(items, input);
  },
};

export default action;
