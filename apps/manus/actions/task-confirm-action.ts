import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type TaskConfirmActionResponse } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/task.confirmAction` — confirm a pending action to resume a task
 * that `task-list-messages` reported as `agent_status: "waiting"`. For a
 * `messageAskUser` wait, use `task-send-message` instead.
 *
 * `idempotent: false`: confirming resumes agent processing rather than
 * converging on a fixed end state, and the vendor documents no dedupe key
 * for it — a retried call is not documented as safe.
 */
interface Input {
  taskId: string;
  eventId: string;
  input?: Record<string, unknown>;
}

const taskConfirmAction: ActionDefinition<Input, TaskConfirmActionResponse> = {
  key: "task-confirm-action",
  type: "perform",
  resource: "task",
  title: "Confirm Action",
  description: "Confirm a pending action so a waiting task can resume.",
  idempotent: false,
  params: [
    taskIdParam,
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      required: true,
      hint: "The `waiting_for_event_id` from the status_update event that requested confirmation.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      advanced: true,
      hint: "Additional input, shaped by the event's confirm_input_schema. Omit for a simple " +
        "yes/no confirmation.",
    },
  ],
  output: [
    { key: "task_id", type: "string", label: "Task ID" },
    { key: "confirmed", type: "boolean", label: "Always true on success" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskConfirmActionResponse>("/v2/task.confirmAction", {
      method: "POST",
      body: compact({
        task_id: input.taskId,
        event_id: input.eventId,
        input: input.input,
      }),
    });
  },
};

export default taskConfirmAction;
