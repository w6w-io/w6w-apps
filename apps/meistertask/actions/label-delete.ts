import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `DELETE /labels/:id` — remove a label from its project. */
interface Input {
  id: number;
}

const labelDelete: ActionDefinition<Input, { deleted: boolean }> = {
  key: "label-delete",
  type: "perform",
  resource: "label",
  title: "Delete Label",
  description: "Delete a label from its project.",
  idempotent: true,
  params: [{ key: "id", label: "Label ID", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new MeisterTaskClient(ctx).status(`/labels/${input.id}`, {
      method: "DELETE",
    });
    return { deleted: status === 204 };
  },
};

export default labelDelete;
