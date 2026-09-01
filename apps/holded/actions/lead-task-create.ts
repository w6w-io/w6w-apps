import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `POST /leads/{leadId}/tasks` — add a new task to a lead.
 *
 * Not idempotent: each call appends a new task, and there is no field to make
 * a retry return the first task instead of creating a second one.
 */
interface Input {
  leadId: string;
  name?: string;
}

const leadTaskCreate: ActionDefinition<Input> = {
  key: "lead-task-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead Task",
  description: "Add a new task to a lead.",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    { key: "name", label: "Task name", type: "string" },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "New task ID" },
  ],

  execute(input, ctx) {
    const body = compact({ name: input.name });
    return new HoldedClient(ctx).write(`/leads/${encodeId(input.leadId)}/tasks`, "POST", body);
  },
};

export default leadTaskCreate;
