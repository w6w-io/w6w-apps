import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /resource/Timesheet` — every Timesheet record this token may see.
 *
 * The generated V1 reference documents the response as a bare array of
 * `Timesheet` objects, and adds the same advice it gives every large table:
 * *"For large tables prefer POST /QUERY with pagination."* No query parameters
 * are documented on the list form, so none are offered here.
 *
 * A Timesheet is the record of time actually worked — distinct from a Roster
 * (what was scheduled): *"When a team member completes a shift, a record is
 * created of the actual times worked by that team member. A timesheet then
 * follows a workflow for 'approval' and 'payment'."* Timesheets are also the
 * largest table in a Deputy install, so the 500-record response cap is easy to
 * hit — use `timesheet-search` with a date range for anything but a small
 * install.
 */
const action: ActionDefinition = {
  key: "timesheet-list",
  type: "read",
  resource: "timesheet",
  title: "List timesheets",
  description:
    "Every timesheet this connection may see, in one response. Deputy caps a response at 500 " +
    "records — use Search Timesheets with a date range on any install of real size.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Timesheet records" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deputy timesheets");
    const items = await new DeputyClient(ctx).list<Record<string, unknown>>("Timesheet");
    return { items, count: items.length };
  },
};

export default action;
