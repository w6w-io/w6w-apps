import type { ActionDefinition } from "@w6w/types";
import { MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `DELETE /v1/drafts/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Drafts, 2026-08-29.
 *
 * `:id` is the draft's own id (from Create Draft's response), not the
 * conversation id. Marked idempotent: a retry after a successful delete
 * leaves the draft in the same deleted state, matching this pack's
 * convention for delete endpoints (e.g. Apify's `webhook-delete`).
 */
const action: ActionDefinition<Input> = {
  key: "draft-delete",
  type: "perform",
  resource: "draft",
  title: "Delete Draft",
  description: "Delete a draft from a conversation.",
  idempotent: true,
  params: [
    { key: "id", label: "Draft ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    ctx.log("info", "deleting Missive draft", { id: input.id });
    const status = await new MissiveClient(ctx).status(`/drafts/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default action;
