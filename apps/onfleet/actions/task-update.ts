import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, OnfleetClient } from "../lib/client.ts";
import { containerParam, metadataParam } from "../lib/params.ts";

/**
 * `PUT /tasks/:id` — update a task.
 *
 * Onfleet restricts what can change once a task has moved past
 * `unassigned`: **active tasks accept only `notes` and `metadata`; completed
 * tasks accept only `metadata` and `customFields`.** Sending anything else at
 * that point is silently ignored rather than rejected, which is worth
 * knowing before assuming an update took effect. Embedded objects
 * (`destination`, `recipients`) cannot be updated in place either — update
 * the destination/recipient by its own id first, then pass that id here.
 */
const action: ActionDefinition = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update task",
  description:
    "Update a task. Only `notes`/`metadata` may change once a task is active, and only " +
    "`metadata`/custom fields once it is completed — everything else is ignored past that point.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "notes", label: "Notes", type: "text", default: "" },
    containerParam,
    {
      key: "completeAfter",
      label: "Complete after",
      type: "number",
      default: "",
      advanced: true,
      hint: "Unix time (ms). Only takes effect on an unassigned task.",
    },
    {
      key: "completeBefore",
      label: "Complete before",
      type: "number",
      default: "",
      advanced: true,
      hint: "Unix time (ms). Only takes effect on an unassigned task.",
    },
    {
      key: "dependencies",
      label: "Dependencies",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated task IDs. Only takes effect on an unassigned task.",
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "state", type: "number", label: "0 unassigned · 1 assigned · 2 active · 3 completed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { taskId } = p as { taskId: string };
    if (!taskId) throw new Error("`taskId` is required");

    const body = compact({
      notes: p.notes,
      container: json(p.container, "container"),
      completeAfter: p.completeAfter,
      completeBefore: p.completeBefore,
      dependencies: csv(p.dependencies),
      metadata: json(p.metadata, "metadata"),
    });
    if (Object.keys(body).length === 0) throw new Error("no fields to update were provided");

    return await new OnfleetClient(ctx).request(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
