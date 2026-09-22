import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import { ID_PARAM } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `GET /resource/Timesheet/{id}` — one Timesheet record.
 *
 * Verified against the generated V1 reference
 * (`developer.deputy.com/reference/gettimesheetbyid-1`, read 2026-09-22). The
 * documented `Timesheet` schema is what makes this the useful read in the pair:
 * a timesheet carries its own workflow state — `TimeApproved`, `PayRuleApproved`,
 * `Disputed`, `ValidationFlag`, `Discarded`, `Invoiced`, `ReviewState`,
 * `TotalTime`, `Cost` and `PaycycleId` — alongside `Employee`, `StartTime`,
 * `EndTime`, `Mealbreak`, `OperationalUnit`, `Roster`, `EmployeeComment` and
 * `SupervisorComment`.
 *
 * Unlike the list form, this endpoint has a documented `join` sibling only on
 * QUERY, so related objects (`EmployeeObject`, `OperationalUnitObject`) are not
 * expanded here — fetch them by id, or use `timesheet-search` with `join`.
 */
const action: ActionDefinition<Input> = {
  key: "timesheet-get",
  type: "read",
  resource: "timesheet",
  title: "Get timesheet",
  description:
    "Get one timesheet by its Deputy id — including its approval, dispute and pay state.",
  params: [
    ID_PARAM("Timesheet ID", "Deputy's internal Timesheet id (`Id`), e.g. from List Timesheets."),
  ],
  output: [
    { key: "Id", type: "number", label: "Timesheet ID" },
    { key: "Employee", type: "number", label: "Employee ID" },
    { key: "Date", type: "string", label: "Date" },
    { key: "StartTime", type: "number", label: "Start time" },
    { key: "EndTime", type: "number", label: "End time" },
    { key: "TotalTime", type: "number", label: "Total time" },
    { key: "OperationalUnit", type: "number", label: "Area (OperationalUnit) ID" },
    { key: "TimeApproved", type: "boolean", label: "Time approved" },
    { key: "Disputed", type: "boolean", label: "Disputed" },
    { key: "Modified", type: "string", label: "Last modified" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Deputy timesheet", { id: input.id });
    return await new DeputyClient(ctx).get("Timesheet", input.id);
  },
};

export default action;
