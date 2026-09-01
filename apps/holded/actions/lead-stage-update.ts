import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `PUT /leads/{leadId}/stages` — move a lead to a different pipeline stage.
 *
 * The most common single write in a CRM workflow: advancing (or losing) a
 * deal. `stageId` accepts either the stage's id or its exact name; per
 * Holded's own note, "if there are multiple matches the oldest stage created
 * will be selected" — worth knowing before relying on a name that a funnel
 * reuses across stages.
 */
interface Input {
  leadId: string;
  stageId: string;
}

const leadStageUpdate: ActionDefinition<Input> = {
  key: "lead-stage-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead Stage",
  description: "Move a lead to a different stage in its funnel.",
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
      key: "stageId",
      label: "Stage",
      type: "string",
      required: true,
      hint: "Stage id or exact stage name. If a name matches more than one stage, Holded picks " +
        "the oldest one created.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Lead ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).write(`/leads/${encodeId(input.leadId)}/stages`, "PUT", {
      stageId: input.stageId,
    });
  },
};

export default leadStageUpdate;
