import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

interface Input {
  intEmployeeId: number;
  intOpunitId: number;
  intStartTimestamp: number;
  intEndTimestamp: number;
  intTimesheetId?: number;
  strComment?: string;
}

/**
 * `POST /api/v1/supervise/timesheet/update` — create **or** update a timesheet
 * from timestamps.
 *
 * Deputy documents this as one endpoint doing both jobs ("Timesheet Management
 * Calls", read 2026-09-22): *"This call allows you to create a new Timesheet
 * Record in Deputy using unix timestamps, defined mealbreak slots and associate
 * it to an employee"*, and the same endpoint's second worked example is
 * *"updating an existing timesheet record in Deputy"* by including
 * `intTimesheetId`. The guide lists all four of the fields below as mandatory
 * (`intEmployeeId`, `intOpunitId`, `intStartTimestamp`, `intEndTimestamp`) plus
 * `intTimesheetId` and `strComment` as optional, and its own examples are:
 *
 * ```json
 * { "intEmployeeId": 1, "intOpunitId": 2, "intStartTimestamp": 1616360400,
 *   "intEndTimestamp": 1616382000 }
 * ```
 *
 * ```json
 * { "intTimesheetId": 1, "intStartTimestamp": 1616360400, "intEndTimestamp": 1616382000,
 *   "intOpunitId": 2, "strComment": "This timesheet was recently updated via the API" }
 * ```
 *
 * ## Why this, and not `POST /resource/Timesheet`
 *
 * The V1 Resource API does expose its own Create and Update Timesheet endpoints
 * (`POST /resource/Timesheet`, `POST /resource/Timesheet/{id}`, both documented
 * in the generated reference), but their request schema is the whole read-side
 * `Timesheet` row — 60-odd properties including `TotalTime`, `TotalTimeInv`,
 * `Cost`, `PaycycleId`, `ValidationFlag`, `ReviewState` and `PayStaged` — with
 * **no description on the two fields that matter most**. The generated spec
 * types `StartTime`/`EndTime` as bare integers and `Mealbreak` as a date-time
 * *string*, and nothing on the page says whether those integers are Unix
 * seconds, minutes or clock offsets. Deputy's hand-written guide, by contrast,
 * spells out `intStartTimestamp` / `intEndTimestamp` as *"Unix timestamp for the
 * start/end of the Timesheet"* and describes the endpoint as the way to create
 * a timesheet. So the documented, unambiguous path is used here, and the
 * resource-level create is left out rather than shipped with guessed field
 * semantics. (The README records this as a known gap.)
 *
 * **Not idempotent** unless `intTimesheetId` is supplied: with no id, a replay
 * creates a second timesheet, exactly as the Resource API's create would.
 */
const action: ActionDefinition<Input> = {
  key: "timesheet-create-or-update",
  type: "perform",
  resource: "timesheet",
  title: "Create or update timesheet",
  description:
    "Write a timesheet from Unix timestamps — creating one when no Timesheet ID is given, and " +
    "updating that timesheet when one is. This is Deputy's documented write path for worked " +
    "time (clock-on/clock-off are separate actions).",
  idempotent: false,
  params: [
    {
      key: "intEmployeeId",
      label: "Employee ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "Deputy's internal Employee id the timesheet belongs to.",
    },
    {
      key: "intOpunitId",
      label: "Area ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The OperationalUnit (Area in the UI) the worked time belongs to.",
    },
    {
      key: "intStartTimestamp",
      label: "Start (Unix timestamp)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Unix seconds, e.g. 1616360400. Deputy rejects a start time in the future.",
    },
    {
      key: "intEndTimestamp",
      label: "End (Unix timestamp)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Unix seconds. Deputy rejects an end time in the future.",
    },
    {
      key: "intTimesheetId",
      label: "Timesheet ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint:
        "Leave empty to create a new timesheet; set it to update that existing record instead. " +
        "With no id, a retry creates a second timesheet — this action cannot be idempotent " +
        "without one.",
    },
    {
      key: "strComment",
      label: "Comment",
      type: "text",
      hint: "Free-text comment attached to the timesheet.",
    },
  ],
  output: [
    { key: "response", type: "object", label: "Deputy's own body (contains the timesheet)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "writing a Deputy timesheet", {
      intEmployeeId: input.intEmployeeId,
      intTimesheetId: input.intTimesheetId,
    });
    const body: Record<string, unknown> = {
      intEmployeeId: input.intEmployeeId,
      intOpunitId: input.intOpunitId,
      intStartTimestamp: input.intStartTimestamp,
      intEndTimestamp: input.intEndTimestamp,
    };
    if (input.intTimesheetId) body.intTimesheetId = input.intTimesheetId;
    if (input.strComment) body.strComment = input.strComment;
    const response = await new DeputyClient(ctx).supervise("timesheet/update", body);
    return { response };
  },
};

export default action;
