import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /1/Tag` — permanently delete a tag by ID. Removes it from every object that carries it. */
interface Input {
  id: string;
}

const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description: "Permanently delete a tag by ID. Any object with this tag has it removed.",
  idempotent: true,
  params: [idParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/Tag", { method: "DELETE", query: { id: input.id } });
    return { deleted: true };
  },
};

export default tagDelete;
