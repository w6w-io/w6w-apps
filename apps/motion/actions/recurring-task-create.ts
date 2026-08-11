import type { ActionDefinition } from "@w6w/types";
import { MotionClient, omitUndefined, V1 } from "../lib/client.ts";
import {
  assigneeIdParam,
  parseDuration,
  recurringDeadlineTypeOptions,
  recurringPriorityOptions,
  workspaceIdParam,
} from "../lib/params.ts";

/**
 * `POST /v1/recurring-tasks` — create a recurring-task definition.
 *
 * ## Three fields differ from a one-off task, and each is a silent trap
 *
 *  1. **`assigneeId` is required.** A one-off task may be unassigned; a
 *     recurring one may not.
 *  2. **`priority` accepts only `HIGH` or `MEDIUM`** — no `ASAP`, no `LOW`,
 *     where a one-off task takes all four.
 *  3. **`deadlineType` accepts only `HARD` or `SOFT`** — no `NONE`, where a
 *     one-off task takes all three.
 *
 * The two enum differences are why `lib/params.ts` keeps separate option lists
 * instead of one shared set; offering the task lists here would put values in
 * the dropdown that this endpoint rejects.
 *
 * ## `frequency` is a domain-specific string, not a cron expression
 *
 * Motion's own "Frequency" cookbook defines a small grammar, and the value is
 * sent verbatim:
 *
 *  - **daily** — `daily_every_day`, `daily_every_week_day`,
 *    `daily_specific_days_[MO, TU, FR]`
 *  - **weekly** — `weekly_any_day`, `weekly_any_week_day`,
 *    `weekly_specific_days_[MO, FR]`
 *  - **bi-weekly** — `biweekly_first_week_any_day`,
 *    `biweekly_second_week_any_week_day`,
 *    `biweekly_first_week_specific_days_[MO, TU]`
 *  - **monthly** — `monthly_first_MO` … `monthly_last_SU`, a bare day-of-month
 *    (`monthly_1`, `monthly_15`, `monthly_31`),
 *    `monthly_any_day_third_week`, `monthly_any_week_day_last_week`,
 *    `monthly_last_day_of_month`, `monthly_any_day_of_month`
 *  - **quarterly** — `quarterly_first_day`, `quarterly_last_week_day`,
 *    `quarterly_first_MO`, `quarterly_any_day_second_month`
 *
 * Day codes are `MO TU WE TH FR SA SU`, and the cookbook is explicit that a day
 * array is never valid on its own — it is always a suffix of one of the forms
 * above. A numeric monthly day beyond a short month's length falls back to that
 * month's last day rather than being skipped.
 *
 * It is a free-text field rather than a `select` because the grammar is
 * open-ended: the specific-days forms embed an arbitrary subset of seven day
 * codes, which is over a hundred legal values before the monthly and quarterly
 * arms are counted.
 *
 * Not idempotent: no idempotency key exists, so a retry creates a second
 * recurring definition — and this one keeps generating tasks forever.
 */
interface Input {
  name: string;
  workspaceId: string;
  assigneeId: string;
  frequency: string;
  description?: string;
  priority?: string;
  deadlineType?: string;
  duration?: string;
  startingOn?: string;
  idealTime?: string;
  schedule?: string;
}

const recurringTaskCreate: ActionDefinition<Input> = {
  key: "recurring-task-create",
  type: "perform",
  resource: "recurring-task",
  title: "Create Recurring Task",
  description:
    "Create a recurring-task definition. Assignee is required, and priority and deadline type " +
    "take narrower value sets than a one-off task.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    workspaceIdParam(true),
    {
      ...assigneeIdParam,
      required: true,
      hint: "REQUIRED for a recurring task, unlike a one-off task. A user id from List Users or " +
        "Get My User.",
    },
    {
      key: "frequency",
      label: "Frequency",
      type: "string",
      required: true,
      placeholder: "weekly_specific_days_[MO, WE, FR]",
      hint: "Motion's own frequency grammar, not cron. Examples: daily_every_week_day · " +
        "weekly_any_day · weekly_specific_days_[MO, WE, FR] · " +
        "biweekly_first_week_any_day · monthly_first_MO · monthly_15 · " +
        "monthly_last_day_of_month · quarterly_first_week_day. Day codes are MO TU WE TH FR SA " +
        "SU, and a day array is only ever a suffix of one of these forms.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "GitHub Flavored Markdown, as on a task.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: recurringPriorityOptions,
      hint: "Only HIGH or MEDIUM here — a recurring task does not accept ASAP or LOW, unlike a " +
        "one-off task. Defaults to MEDIUM.",
    },
    {
      key: "deadlineType",
      label: "Deadline type",
      type: "select",
      options: recurringDeadlineTypeOptions,
      hint: "Only HARD or SOFT here — NONE is accepted on a one-off task but not on a recurring " +
        "one. Defaults to SOFT.",
    },
    {
      key: "duration",
      label: "Duration",
      type: "string",
      placeholder: "30",
      hint: 'Minutes as a whole number greater than 0, or the word "REMINDER". Note "NONE", ' +
        "which a one-off task accepts, is not documented here.",
    },
    {
      key: "startingOn",
      label: "Starting on",
      type: "string",
      placeholder: "2026-08-12",
      hint: "ISO 8601, trimmed to the start of the day — 2024-03-12 or " +
        "2024-03-12T06:00:00.000Z both work.",
    },
    {
      key: "idealTime",
      label: "Ideal time",
      type: "string",
      placeholder: "09:30",
      hint: "HH:mm. Motion schedules here when the slot is free, and elsewhere when it is not.",
    },
    {
      key: "schedule",
      label: "Schedule",
      type: "string",
      placeholder: "Work Hours",
      hint: 'Defaults to "Work Hours", the one schedule every user has. Other names come from ' +
        "List Schedules.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Recurring task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "frequency", type: "string", label: "Frequency" },
    { key: "workspace.id", type: "string", label: "Workspace ID" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Motion recurring task", { workspaceId: input.workspaceId });
    return new MotionClient(ctx).json(`${V1}/recurring-tasks`, {
      method: "POST",
      body: omitUndefined({
        name: input.name,
        workspaceId: input.workspaceId,
        assigneeId: input.assigneeId,
        frequency: input.frequency,
        description: input.description,
        priority: input.priority,
        deadlineType: input.deadlineType,
        duration: parseDuration(input.duration),
        startingOn: input.startingOn,
        idealTime: input.idealTime,
        schedule: input.schedule,
      }),
    });
  },
};

export default recurringTaskCreate;
