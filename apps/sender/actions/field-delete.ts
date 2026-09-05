import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `DELETE /v2/fields/{id}` — deletes a custom field. */
interface Input {
  id: string;
}

const fieldDelete: ActionDefinition<Input> = {
  key: "field-delete",
  type: "perform",
  resource: "field",
  title: "Delete Field",
  description: "Delete the specified custom field.",
  idempotent: true,
  params: [{ key: "id", label: "Field ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/fields/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default fieldDelete;
