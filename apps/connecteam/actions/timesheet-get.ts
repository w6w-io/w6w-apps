import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { dateRangeParams, timeClockIdParam } from "../lib/params.ts";

/**
 * `GET /time-clock/v1/time-clocks/{timeClockId}/timesheet` — approved and
 * unapproved hour totals per user over a date range (max 45 days).
 */
interface Input {
  timeClockId: number;
  startDate: string;
  endDate: string;
  userIds?: string;
  groupIds?: string;
  jobIds?: string;
  isApproved?: boolean;
  isSubmitted?: boolean;
  isLocked?: boolean;
  includePlanVsActual?: boolean;
}

const timesheetGet: ActionDefinition<Input> = {
  key: "timesheet-get",
  type: "read",
  resource: "time-clock",
  title: "Get Timesheet Totals",
  description: "Get hour totals per user for a time clock over a date range (max 45 days).",
  params: [
    timeClockIdParam,
    ...dateRangeParams(true, {
      start: "ISO 8601 (YYYY-MM-DD). Includes from 00:00:00 on this date.",
      end: "ISO 8601 (YYYY-MM-DD). Includes up to 23:59:59 on this date. No more than 45 days " +
        "after the start date.",
    }),
    { key: "userIds", label: "User IDs", type: "string", hint: "Comma-separated numeric ids." },
    { key: "groupIds", label: "Cohort/group IDs", type: "string", hint: "Comma-separated." },
    { key: "jobIds", label: "Job IDs", type: "string", hint: "Comma-separated." },
    { key: "isApproved", label: "Approved only / unapproved only", type: "boolean" },
    { key: "isSubmitted", label: "Submitted only / unsubmitted only", type: "boolean" },
    { key: "isLocked", label: "Locked only / unlocked only", type: "boolean" },
    {
      key: "includePlanVsActual",
      label: "Include plan-vs-actual",
      type: "boolean",
      hint: "Off by default. When on, adds scheduled-vs-worked comparisons per day.",
    },
  ],
  output: [
    { key: "startDate", type: "string", label: "Start date" },
    { key: "endDate", type: "string", label: "End date" },
    { key: "users", type: "array", label: "Per-user totals" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/time-clock/v1/time-clocks/${input.timeClockId}/timesheet`,
      {
        query: {
          startDate: input.startDate,
          endDate: input.endDate,
          userIds: toIdList(input.userIds),
          groupIds: toList(input.groupIds),
          jobIds: toList(input.jobIds),
          isApproved: input.isApproved,
          isSubmitted: input.isSubmitted,
          isLocked: input.isLocked,
          includePlanVsActual: input.includePlanVsActual,
        },
      },
    );
  },
};

export default timesheetGet;
