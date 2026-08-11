import type { ActionDefinition } from "@w6w/types";
import { MotionClient, omitUndefined, optionalJson, toStringList, V1 } from "../lib/client.ts";
import {
  assigneeIdParam,
  autoScheduledParam,
  durationParam,
  labelsParam,
  parseDuration,
  priorityOptions,
  workspaceIdParam,
} from "../lib/params.ts";

/**
 * `POST /v1/tasks` — create a task.
 *
 * ## Not idempotent, and there is no idempotency key
 *
 * Motion's reference documents no idempotency key on any endpoint. Every call
 * creates a new task, so a retry produces a duplicate — which is why
 * `idempotent` is `false` and why the runtime must never retry this on its own.
 *
 * ## `dueDate` is conditionally required, and the condition is not a form rule
 *
 * The reference marks `dueDate` optional but adds "REQUIRED for scheduled
 * tasks". Whether a task is scheduled depends on `autoScheduled` *and* on
 * whether the chosen status has auto-scheduling enabled in Motion — a workspace
 * setting this app cannot see. So it is declared optional here and the condition
 * is stated in the hint; making it unconditionally required would block every
 * unscheduled task.
 *
 * ## `description` is Markdown, with one broken construct
 *
 * Motion parses description fields as GitHub Flavored Markdown. Its own cookbook
 * records that task-list checkboxes (`- [ ]`) do **not** work, because the
 * editor behind the field is ProseMirror, and gives a raw-HTML `<ul
 * data-type="taskList">` block as the workaround. Everything else in GFM is
 * fine.
 */
interface Input {
  name: string;
  workspaceId: string;
  projectId?: string;
  assigneeId?: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  duration?: string;
  autoScheduled?: unknown;
  labels?: string[];
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a workspace, optionally auto-scheduled by Motion.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    workspaceIdParam(true),
    {
      key: "projectId",
      label: "Project",
      type: "string",
      hint: "From the `id` of a List Projects result.",
    },
    assigneeIdParam,
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "GitHub Flavored Markdown. Checkbox syntax (`- [ ]`) does not render — Motion's own " +
        'cookbook gives a raw `<ul data-type="taskList">` block as the workaround.',
    },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "A status NAME from this workspace — see List Statuses. Defaults to the workspace's " +
        "default status.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "datetime",
      hint: "ISO 8601. Motion documents this as REQUIRED for a scheduled task, which depends on " +
        "the status having auto-scheduling enabled — so it is optional here and Motion decides.",
    },
    durationParam,
    autoScheduledParam,
    labelsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status.name", type: "string", label: "Status" },
    { key: "scheduledStart", type: "string", label: "Scheduled start" },
    { key: "schedulingIssue", type: "boolean", label: "Motion could not schedule this task" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Motion task", { workspaceId: input.workspaceId });
    return new MotionClient(ctx).json(`${V1}/tasks`, {
      method: "POST",
      body: omitUndefined({
        name: input.name,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        assigneeId: input.assigneeId,
        description: input.description,
        priority: input.priority,
        status: input.status,
        dueDate: input.dueDate,
        duration: parseDuration(input.duration),
        autoScheduled: optionalJson(input.autoScheduled, "Auto-schedule"),
        labels: toStringList(input.labels),
      }),
    });
  },
};

export default taskCreate;
