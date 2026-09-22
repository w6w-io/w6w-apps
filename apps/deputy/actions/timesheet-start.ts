import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

interface Input {
  intOpunitId: number;
  intEmployeeId: number;
}

/**
 * `POST /api/v1/supervise/timesheet/start` — clock an employee on.
 *
 * Deputy documents this write path in "Timesheet Management Calls" (read
 * 2026-09-22): the endpoint table lists `POST /api/v1/supervise/timesheet/start`
 * as *"Start an employee's timesheet"* for both Premium and Enterprise, and the
 * generated reference for it
 * (`developer.deputy.com/reference/startanemployeestimesheetclockon`) declares
 * its body with both fields **required**:
 *
 *   | Field           | Type    | Meaning                                            |
 *   | --------------- | ------- | -------------------------------------------------- |
 *   | `intOpunitId`   | integer | *"The id of the location the area the timesheet is for"* |
 *   | `intEmployeeId` | integer | *"The id record of the employee for who the timesheet is for"* |
 *
 * The guide's own sample is `{"intEmployeeId": 3, "intOpunitId": 1}`, so the
 * operator names are sent exactly as Deputy's payloads spell them — Deputy's
 * structured `supervise` endpoints use `int…`-prefixed keys throughout, unlike
 * the `Employee`/`Timesheet` resources, whose properties are bare PascalCase.
 *
 * The response body has no documented schema (the reference's 200 carries no
 * content, the guide only promises "the JSON response contains the timesheet
 * object"), so it is returned whole under `response` rather than projected.
 *
 * **Not idempotent.** There is no idempotency key, and an ambiguous failure
 * followed by a retry is exactly the case that can leave an employee clocked on
 * twice — the guide's own error table even warns about the neighbouring
 * failure mode, "Sorry, you can not start another break when there is a break
 * in place".
 */
const action: ActionDefinition<Input> = {
  key: "timesheet-start",
  type: "perform",
  resource: "timesheet",
  title: "Clock on (start timesheet)",
  description: "Start an employee's timesheet for a given area — Deputy's clock-on call.",
  idempotent: false,
  params: [
    {
      key: "intEmployeeId",
      label: "Employee ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "Deputy's internal Employee id.",
    },
    {
      key: "intOpunitId",
      label: "Area ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The OperationalUnit (the UI calls these Areas) the timesheet is for. Deputy's own " +
        "error table has a dedicated 'you must set the area for the timesheet' failure.",
    },
  ],
  output: [
    { key: "response", type: "object", label: "Deputy's own body (contains the timesheet)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "clocking an employee on in Deputy", {
      intEmployeeId: input.intEmployeeId,
      intOpunitId: input.intOpunitId,
    });
    const response = await new DeputyClient(ctx).supervise("timesheet/start", {
      intEmployeeId: input.intEmployeeId,
      intOpunitId: input.intOpunitId,
    });
    return { response };
  },
};

export default action;
