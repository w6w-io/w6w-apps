import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/**
 * `POST /tasks/:id/complete` — force-complete an active task.
 *
 * This is for when the worker's own app can't or won't mark a task done (a
 * dispatcher closing it out over the phone, a system-of-record override) —
 * it only works on a task in the `active` state (`state: 2`), and a task
 * completed this way cannot be updated afterwards.
 */
const action: ActionDefinition = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Force-complete task",
  description: "Force-complete an active task from outside the worker's app.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    {
      key: "success",
      label: "Successful",
      type: "boolean",
      default: true,
      hint: "Whether the completion should be recorded as successful or failed.",
    },
    {
      key: "notes",
      label: "Completion notes",
      type: "text",
      default: "",
    },
  ],
  output: [{ key: "completed", type: "boolean", label: "Whether the task was completed" }],

  async execute(input, ctx) {
    const { taskId, success, notes } = input as {
      taskId: string;
      success?: boolean;
      notes?: string;
    };
    if (!taskId) throw new Error("`taskId` is required");

    await new OnfleetClient(ctx).request(`/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: "POST",
      body: {
        completionDetails: {
          success: success !== false,
          ...(notes ? { notes } : {}),
        },
      },
    });
    ctx.log("info", "force-completed an Onfleet task", { taskId, success: success !== false });
    return { completed: true };
  },
};

export default action;
