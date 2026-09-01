import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `DELETE /funnels/{funnelId}` — remove a funnel.
 *
 * Idempotent in the sense the runtime cares about: the end state after one
 * call and after five is the same funnel gone.
 */
interface Input {
  funnelId: string;
}

const funnelDelete: ActionDefinition<Input> = {
  key: "funnel-delete",
  type: "perform",
  resource: "funnel",
  title: "Delete Funnel",
  description: "Delete a funnel by id.",
  idempotent: true,
  params: [
    {
      key: "funnelId",
      label: "Funnel ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Funnels result.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Funnel ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).delete(`/funnels/${encodeId(input.funnelId)}`);
  },
};

export default funnelDelete;
