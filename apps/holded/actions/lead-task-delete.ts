import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `DELETE /leads/{leadId}/tasks` — remove one task from a lead.
 *
 * The task to delete is named in the request **body** (`taskId`), not a path
 * segment — the one delete in this app that is not addressed purely by URL.
 * Idempotent in the sense the runtime cares about: the end state after one
 * call and after five is the same task gone.
 */
interface Input {
  leadId: string;
  taskId: string;
}

const leadTaskDelete: ActionDefinition<Input> = {
  key: "lead-task-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead Task",
  description: "Remove one task from a lead.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the `taskId` of a task in the lead's `tasks` array.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Deleted task ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).delete(`/leads/${encodeId(input.leadId)}/tasks`, {
      taskId: input.taskId,
    });
  },
};

export default leadTaskDelete;
