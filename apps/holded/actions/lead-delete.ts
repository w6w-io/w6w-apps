import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `DELETE /leads/{leadId}` — remove a lead.
 *
 * Idempotent in the sense the runtime cares about: the end state after one
 * call and after five is the same lead gone.
 */
interface Input {
  leadId: string;
}

const leadDelete: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Delete a lead by id.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Lead ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).delete(`/leads/${encodeId(input.leadId)}`);
  },
};

export default leadDelete;
