import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `DELETE /comments/:id` — delete a comment. */
interface Input {
  id: number;
}

const commentDelete: ActionDefinition<Input, { deleted: boolean }> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment.",
  idempotent: true,
  params: [{ key: "id", label: "Comment ID", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new MeisterTaskClient(ctx).status(`/comments/${input.id}`, {
      method: "DELETE",
    });
    return { deleted: status === 204 };
  },
};

export default commentDelete;
