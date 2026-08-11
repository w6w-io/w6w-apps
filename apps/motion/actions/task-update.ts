import type { ActionDefinition } from "@w6w/types";
import {
  encodeId,
  MotionClient,
  omitUndefined,
  optionalJson,
  toStringList,
  V1,
} from "../lib/client.ts";
import {
  assigneeIdParam,
  autoScheduledParam,
  durationParam,
  labelsParam,
  parseDuration,
  priorityOptions,
  taskIdParam,
  workspaceIdParam,
} from "../lib/params.ts";

/**
 * `PATCH /v1/tasks/{id}` — update a task.
 *
 * ## It is a PATCH that documents a full body, and `name` + `workspaceId` are required
 *
 * This is the one shape in Motion's API most likely to cost an afternoon. The
 * "Update task" reference page documents **the same body as "Create task"**,
 * including `name` and `workspaceId` marked `required` — so despite the HTTP
 * verb, Motion does not describe a sparse patch. Both are therefore required
 * here, matching the reference: sending only the field you meant to change would
 * be relying on undocumented behaviour, and if the documentation is right it
 * fails with a 400 instead.
 *
 * The practical consequence is that an update re-states the task. Read the task
 * first (`task-get`) and pass its current `name` and `workspace.id` back unless
 * you actually mean to change them — because `name` is *also* the field that
 * renames a task, so a wrong value here is a silent rename rather than an error.
 *
 * ## Idempotent
 *
 * Sending the same body twice leaves the task in the same state, so a retry
 * after a dropped connection is safe. That is exactly what `idempotent: true`
 * licenses the runtime to do, and it is true here precisely *because* the body
 * is a full restatement rather than a relative change.
 *
 * ## Turning auto-scheduling off
 *
 * `autoScheduled` is `object | null`, and `null` is the only way to switch
 * Motion's scheduler off for an existing task. Enter the literal `null` in the
 * Auto-schedule field; leaving it empty means "do not touch it" and is a
 * different instruction. See `optionalJson` in `lib/client.ts`, which exists to
 * keep those two apart.
 */
interface Input {
  id: string;
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

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description:
    "Update a task. Motion documents the full create body here, so name and workspace are " +
    "required and the call restates the task rather than patching one field.",
  idempotent: true,
  params: [
    taskIdParam,
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Required by Motion's update reference. It is also the rename field — pass the " +
        "task's CURRENT name unless you mean to rename it.",
    },
    workspaceIdParam(
      true,
      "Required by Motion's update reference. Pass the task's current `workspace.id`; use Move " +
        "Task to change which workspace a task lives in.",
    ),
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
      hint: "GitHub Flavored Markdown. Checkbox syntax (`- [ ]`) does not render — see Motion's " +
        "description cookbook for the raw-HTML workaround.",
    },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "A status NAME from this workspace — see List Statuses.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "datetime",
      hint: "ISO 8601. Motion documents it as required for a scheduled task.",
    },
    durationParam,
    autoScheduledParam,
    labelsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status.name", type: "string", label: "Status" },
    { key: "updatedTime", type: "string", label: "Last updated" },
    { key: "schedulingIssue", type: "boolean", label: "Motion could not schedule this task" },
  ],

  execute(input, ctx) {
    ctx.log("info", "updating Motion task", { id: input.id });
    return new MotionClient(ctx).json(`${V1}/tasks/${encodeId(input.id)}`, {
      method: "PATCH",
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

export default taskUpdate;
