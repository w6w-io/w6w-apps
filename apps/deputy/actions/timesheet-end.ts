import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

interface Input {
  intTimesheetId: number;
  intMealbreakMinute?: number;
}

/**
 * `POST /api/v1/supervise/timesheet/end` — clock an employee off.
 *
 * Documented in "Timesheet Management Calls" (read 2026-09-22) as *"End an
 * employee's timesheet"*, with the generated reference
 * (`.../stopanemployeestimesheetclockoff`) declaring both fields **required**:
 * `intTimesheetId` (*"Record id of the timesheet to stop"*) and
 * `intMealbreakMinute` (*"Number of minutes taken as a meal break in the
 * timesheet period"*).
 *
 * **The two doc surfaces disagree about the mealbreak, and this action follows
 * the stricter one.** The hand-written guide's field table marks
 * `intMealbreakMinute` as optional, while the generated schema lists it as
 * required — and the guide's own worked example for ending a timesheet sends
 * `"intMealbreakMinute": 0`, so sending an explicit value is what both the
 * reference and Deputy's example do. It therefore has a `default` of 0 rather
 * than being optional.
 *
 * The guide's example is:
 *
 * ```json
 * { "intTimesheetId": 3, "intMealbreakMinute": 30 }
 * ```
 *
 * **Idempotent** in the pack's sense: the call names one timesheet id and sets
 * its end state, so replaying the same body lands the same record in the same
 * state instead of creating a second one.
 */
const action: ActionDefinition<Input> = {
  key: "timesheet-end",
  type: "perform",
  resource: "timesheet",
  title: "Clock off (end timesheet)",
  description:
    "End an employee's timesheet and record the meal break taken in it — Deputy's clock-off " +
    "call.",
  idempotent: true,
  params: [
    {
      key: "intTimesheetId",
      label: "Timesheet ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The Timesheet to end — the record clock-on or your own search produced.",
    },
    {
      key: "intMealbreakMinute",
      label: "Meal break (minutes)",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint:
        "Whole minutes taken as an undefined meal break, deducted from the timesheet. Deputy's " +
        "reference marks this required and its own example sends 0; the hand-written guide " +
        "calls it optional, so 0 is prefilled here — say what was actually taken.",
    },
  ],
  output: [
    { key: "response", type: "object", label: "Deputy's own body (contains the timesheet)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "clocking an employee off in Deputy", {
      intTimesheetId: input.intTimesheetId,
      intMealbreakMinute: input.intMealbreakMinute ?? 0,
    });
    const response = await new DeputyClient(ctx).supervise("timesheet/end", {
      intTimesheetId: input.intTimesheetId,
      intMealbreakMinute: input.intMealbreakMinute ?? 0,
    });
    return { response };
  },
};

export default action;
