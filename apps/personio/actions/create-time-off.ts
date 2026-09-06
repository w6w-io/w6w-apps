import type { ActionDefinition } from "@w6w/types";
import { flattenTimeOffPeriod, requestForm, type TimeOffPeriodResource } from "../lib/client.ts";

/**
 * `POST /company/time-offs` — creates a day-unit absence period. **Personio documents
 * only `application/x-www-form-urlencoded` for this endpoint** — no JSON body option,
 * unlike Create/Update Employee — so this action posts a form body via `requestForm`.
 *
 * `skipApproval` defaults to `true` in Personio's own schema: leaving it unset creates the
 * absence already approved. Set it to `false` to route it through the absence type's
 * configured approval flow instead, if one exists.
 */
interface Input {
  employeeId: number;
  timeOffTypeId: number;
  startDate: string;
  endDate: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  comment?: string;
  skipApproval?: boolean;
}

interface TimeOffResponse {
  data?: TimeOffPeriodResource;
}

const createTimeOff: ActionDefinition<Input, unknown> = {
  key: "create-time-off",
  type: "perform",
  resource: "absence",
  title: "Create Time-Off",
  description: "Create a day-unit absence period for an employee.",
  idempotent: false,
  params: [
    { key: "employeeId", label: "Employee ID", type: "number", required: true },
    {
      key: "timeOffTypeId",
      label: "Time-off type ID",
      type: "number",
      required: true,
      hint: "From List Time-Off Types.",
    },
    { key: "startDate", label: "Start date", type: "date", required: true, row: "range" },
    { key: "endDate", label: "End date", type: "date", required: true, row: "range" },
    { key: "halfDayStart", label: "Half-day start", type: "boolean", row: "half" },
    { key: "halfDayEnd", label: "Half-day end", type: "boolean", row: "half" },
    { key: "comment", label: "Comment", type: "text" },
    {
      key: "skipApproval",
      label: "Skip approval",
      type: "boolean",
      default: true,
      hint: "Defaults to true (created already approved). Set to false to route through " +
        "the absence type's configured approval flow.",
      advanced: true,
    },
  ],
  output: [
    { key: "timeOff", type: "object", label: "Created time-off period" },
  ],

  async execute(input, ctx) {
    const res = await requestForm<TimeOffResponse>(ctx, "/company/time-offs", "POST", {
      employee_id: input.employeeId,
      time_off_type_id: input.timeOffTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      half_day_start: input.halfDayStart,
      half_day_end: input.halfDayEnd,
      comment: input.comment,
      skip_approval: input.skipApproval,
    });
    return { timeOff: flattenTimeOffPeriod(res.data) };
  },
};

export default createTimeOff;
