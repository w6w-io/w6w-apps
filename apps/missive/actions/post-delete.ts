import type { ActionDefinition } from "@w6w/types";
import { MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /v1/posts/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Posts, 2026-08-29.
 *
 * For a post in a conversation shared with an organization, the API token
 * must belong to an organization owner or admin.
 */
const action: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Delete a post from a conversation. For shared conversations, the token must " +
    "belong to an organization owner or admin.",
  idempotent: true,
  params: [
    { key: "id", label: "Post ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    ctx.log("info", "deleting Missive post", { id: input.id });
    const status = await new MissiveClient(ctx).status(`/posts/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default action;
