import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";

/**
 * `GET /v1/schedules` — the calling user's schedules.
 *
 * A schedule is a named set of working windows per weekday plus a timezone, and
 * its **name** is what `schedule` takes on an auto-scheduled task or a recurring
 * task. Every user has one called `"Work Hours"`, which is the documented
 * default — and which the task reference says MUST be the value when scheduling
 * a task for *another* user.
 *
 * Each entry is `{name, timezone, isDefaultTimezone, schedule}` where `schedule`
 * maps `monday`…`sunday` to arrays of `{start, end}` in `HH:MM`.
 *
 * Takes no parameters at all: the endpoint answers for whoever owns the key, and
 * answers a **bare array** with no envelope and no cursor, wrapped here as
 * `items` for uniformity with the other list actions.
 */
type Input = Record<string, never>;

const scheduleList: ActionDefinition<Input> = {
  key: "schedule-list",
  type: "read",
  resource: "schedule",
  title: "List Schedules",
  description:
    "List the key owner's schedules. A schedule NAME is what the auto-schedule and recurring-" +
    'task endpoints take; every user has "Work Hours".',
  params: [],
  output: [
    {
      key: "items",
      type: "array",
      label: "Schedules — each { name, timezone, isDefaultTimezone, schedule }",
    },
  ],

  async execute(_input, ctx) {
    // A bare array, not the `{meta, …}` envelope the paginated endpoints use.
    const items = await new MotionClient(ctx).json<unknown[]>(`${V1}/schedules`);
    return { items: items ?? [] };
  },
};

export default scheduleList;
