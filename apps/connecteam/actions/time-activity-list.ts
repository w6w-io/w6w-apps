import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { dateRangeParams, timeClockIdParam } from "../lib/params.ts";

/**
 * `GET /time-clock/v1/time-clocks/{timeClockId}/time-activities` — shifts,
 * manual breaks and time-off entries recorded on one time clock, grouped by
 * user in the response (`timeActivitiesByUsers`).
 */
interface Input {
  timeClockId: number;
  startDate: string;
  endDate: string;
  userIds?: string;
  jobIds?: string;
  activityTypes?: string[] | string;
}

const timeActivityList: ActionDefinition<Input> = {
  key: "time-activity-list",
  type: "search",
  resource: "time-activity",
  title: "List Time Activities",
  description: "List shifts, manual breaks and time-off entries recorded on a time clock.",
  params: [
    timeClockIdParam,
    ...dateRangeParams(true, {
      start: "ISO 8601 (YYYY-MM-DD), inclusive.",
      end: "ISO 8601 (YYYY-MM-DD), inclusive.",
    }),
    { key: "userIds", label: "User IDs", type: "string", hint: "Comma-separated numeric ids." },
    { key: "jobIds", label: "Job IDs", type: "string", hint: "Comma-separated." },
    {
      key: "activityTypes",
      label: "Activity types",
      type: "multiselect",
      options: [
        { value: "shift", label: "Shift" },
        { value: "manual_break", label: "Manual break" },
        { value: "time_off", label: "Time off" },
      ],
    },
  ],
  output: [
    { key: "timeActivitiesByUsers", type: "array", label: "Time activities, grouped by user" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/time-clock/v1/time-clocks/${input.timeClockId}/time-activities`,
      {
        query: {
          startDate: input.startDate,
          endDate: input.endDate,
          userIds: toIdList(input.userIds),
          jobIds: toList(input.jobIds),
          activityTypes: toList(input.activityTypes),
        },
      },
    );
  },
};

export default timeActivityList;
