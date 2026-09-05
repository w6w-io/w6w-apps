import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /1/Contact` — permanently deletes one contact by ID. */
interface Input {
  id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a single contact by ID.",
  idempotent: true,
  params: [idParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/Contact", {
      method: "DELETE",
      query: { id: input.id },
    });
    return { deleted: true };
  },
};

export default contactDelete;
